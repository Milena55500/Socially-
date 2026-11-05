// Calls Google Gemini (free tier) or Anthropic Claude from the server. The key lives only in Vercel env vars.

export type GenerateInput = {
  business: string;
  product: string;
  audience: string;
  platform: string;
  tone: string;
};

export type PostIdea = {
  idea: string;
  hook: string;
  caption: string;
  hashtags: string[];
  visual: string;
};

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
// Gemini models to try in order (free tier). Override with GEMINI_MODEL.
const GEMINI_MODELS = process.env.GEMINI_MODEL
  ? [process.env.GEMINI_MODEL]
  : ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.6-flash"];

async function callGemini(key: string, system: string, user: string): Promise<string> {
  let lastError = "AI request failed";
  for (const model of GEMINI_MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": key, "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { responseMimeType: "application/json", maxOutputTokens: 4000, temperature: 0.9 },
        }),
      }
    );
    const data = await res.json();
    if (res.ok) {
      const parts = data?.candidates?.[0]?.content?.parts || [];
      return parts.map((p: { text?: string }) => p.text || "").join("");
    }
    lastError = data?.error?.message || lastError;
    // Try the next model if this one isn't available or is rate-limited.
    if (![400, 403, 404, 429].includes(res.status) || /API key/i.test(lastError)) break;
  }
  throw new Error(lastError);
}

async function callAnthropic(key: string, system: string, user: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 2500,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "AI request failed");
  return (data.content || [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");
}

export async function generatePosts(input: GenerateInput): Promise<PostIdea[]> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!geminiKey && !anthropicKey) {
    throw new Error("No AI key found. Add GEMINI_API_KEY in Vercel environment variables, then redeploy.");
  }

  const system = `You are Socially, an expert social media strategist for small businesses and creators.
You write posts that sound human, specific, and on-brand. Never generic filler like "Check out our amazing product!".
Respond with ONLY valid JSON, no markdown fences, in this exact shape:
{"posts":[{"idea":"one-line concept","hook":"scroll-stopping first line","caption":"full ready-to-post caption with line breaks as \\n and a clear call to action","hashtags":["#tag", "..."],"visual":"what photo or video to shoot or design"}]}
Write exactly 3 distinct posts, each with a different angle (e.g. behind-the-scenes, customer benefit, story or trend).
Use 8-15 hashtags per post: a mix of broad, niche, and local/community tags. Match the platform's norms for length and style.`;

  const user = `Business: ${input.business || "(not given)"}
Product or service to promote: ${input.product}
Target audience: ${input.audience || "(not given, infer a sensible one)"}
Platform: ${input.platform}
Tone: ${input.tone}`;

  const text = geminiKey
    ? await callGemini(geminiKey, system, user)
    : await callAnthropic(anthropicKey as string, system, user);
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  const parsed = JSON.parse(json);
  return (parsed.posts || []).map((p: Partial<PostIdea>) => ({
    idea: String(p.idea || ""),
    hook: String(p.hook || ""),
    caption: String(p.caption || ""),
    hashtags: Array.isArray(p.hashtags) ? p.hashtags.map(String) : [],
    visual: String(p.visual || ""),
  }));
}
