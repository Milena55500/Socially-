// Calls Anthropic's Claude API from the server. The key lives only in Vercel env vars.

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

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";

export async function generatePosts(input: GenerateInput): Promise<PostIdea[]> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set in Vercel environment variables.");

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

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2500,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "AI request failed");

  const text: string = (data.content || [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");
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
