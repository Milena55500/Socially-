// Calls Google Gemini (free tier) or Anthropic Claude from the server. The key lives only in Vercel env vars.

export type GenerateInput = {
  business: string;
  product: string;
  audience: string;
  platform: string;
  tone: string;
  link?: string;
  kind?: "personal" | "business";
  occasion?: string;
};

export type PostIdea = {
  idea: string;
  hook: string;
  caption: string;
  hashtags: string[];
  visual: string;
  graphicHeadline: string;
  graphicSub: string;
  needsInfo: string[];
};

export type BrandBrief = {
  summary: string;
  facts: string[];
  voice: string;
  audience: string;
  missing: string[];
};

// Everything Socially knows about a business, gathered from the Brand Kit.
export type BrandContext = {
  businessName?: string;
  instagram?: string;
  websiteText?: string;
  samplePosts?: string;
  notes?: string;
  brief?: BrandBrief | null;
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
          generationConfig: { responseMimeType: "application/json", maxOutputTokens: 6000, temperature: 0.8 },
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
      max_tokens: 4000,
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

// Sends a prompt to whichever AI provider is configured and parses the JSON it returns.
async function askForJson(system: string, user: string): Promise<Record<string, unknown>> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!geminiKey && !anthropicKey) {
    throw new Error("No AI key found. Add GEMINI_API_KEY in Vercel environment variables, then redeploy.");
  }
  const text = geminiKey
    ? await callGemini(geminiKey, system, user)
    : await callAnthropic(anthropicKey as string, system, user);
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  try {
    return JSON.parse(json);
  } catch {
    throw new Error("The AI sent back something we couldn't read. Please try again.");
  }
}

const strings = (v: unknown, max = 20): string[] =>
  Array.isArray(v) ? v.map(String).map((s) => s.trim()).filter(Boolean).slice(0, max) : [];

// Reads the website, past posts and notes once, and writes down what's true about the business
// and how it sounds. The user can check this before any posts get written.
export async function buildBrandBrief(ctx: BrandContext): Promise<BrandBrief> {
  const system = `You are a careful researcher. You read a person's or small business's website text, past social posts, and notes,
and record ONLY what those sources actually say. Never guess or add details that aren't in the sources.
Respond with ONLY valid JSON, no markdown fences, in this exact shape:
{"summary":"2-3 sentences: who this person or business is (school, major, interests, or what the business does), where, and for whom",
"facts":["specific, checkable facts from the sources: names, locations, dates, hours, prices, products, vendors, recurring events, policies, slogans"],
"voice":"how they write, based on the past posts if given (sentence length, emoji use, slang, humor, sign-offs, how they address followers). If no posts were given, describe the website's voice.",
"audience":"who they seem to be talking to",
"missing":["important things a social post might need that the sources DON'T say, e.g. next event date, ticket price"]}
Use 6-20 facts. Copy names, dates and numbers exactly as written.`;

  const user = [
    ctx.businessName && `BUSINESS NAME: ${ctx.businessName}`,
    ctx.instagram && `INSTAGRAM HANDLE: ${ctx.instagram}`,
    ctx.notes && `OWNER NOTES:\n${ctx.notes}`,
    ctx.samplePosts && `PAST SOCIAL POSTS (written by the owner):\n${ctx.samplePosts}`,
    ctx.websiteText && `WEBSITE TEXT:\n${ctx.websiteText}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const parsed = await askForJson(system, user);
  return {
    summary: String(parsed.summary || ""),
    facts: strings(parsed.facts, 25),
    voice: String(parsed.voice || ""),
    audience: String(parsed.audience || ""),
    missing: strings(parsed.missing, 8),
  };
}

const PERSONAL_SYSTEM = `You are Socially, a caption writer for college students and young creators posting about their own lives:
graduation and grad pics, nights out, formals, game days, trips, photo dumps, internships, awards, and other wins.
You write captions the person would actually post. They should sound like a real 18-25 year old, not a brand or a greeting card.

TRUTH RULES (most important):
- Only use details the person gave you (or that appear in their profile). Don't invent names, places, schools, majors, dates, companies or inside jokes.
- If a caption would be better with a detail you don't have, use a short placeholder in square brackets like [SCHOOL], [MAJOR], [@FRIEND], [COMPANY], and list it in "needsInfo".

VOICE RULES:
- If PAST POSTS are given, copy their style closely: length, lowercase vs. capitals, emoji habits, slang, punctuation.
- Otherwise: short and natural. Instagram captions are usually 1-3 short lines; photo dumps can be a few words. Lowercase is fine. Emojis sparingly.
- No marketing language, no "call to action", no "link in bio" unless they asked. Never sound like LinkedIn on Instagram.
- LinkedIn is the exception: write a proud-but-humble first-person update with a few short paragraphs, thank people, and keep it professional.
- Graduation/accomplishments: proud, a little sentimental, thank people if they mentioned them.
- Nights out: fun and witty. Keep it tasteful: nothing that would embarrass them with a future employer or professor, and don't glorify heavy drinking.
- Hashtags: most students use few or none. Give 0-4 natural ones (school or class-year tags if known, e.g. [#SCHOOL27]); for LinkedIn 3-5 professional ones.

Respond with ONLY valid JSON, no markdown fences, in this exact shape:
{"posts":[{"idea":"one-line description of this option's vibe","hook":"the first line of the caption","caption":"the full caption, line breaks as \\n","hashtags":["#tag"],"visual":"which photo to lead with or how to order the carousel","graphicHeadline":"2-6 word text for an optional story/graphic overlay, e.g. 'class of 2027'","graphicSub":"short second line, max 8 words","needsInfo":["[SCHOOL]"]}]}
Write exactly 3 options with clearly different vibes (e.g. short and funny, sentimental, one-liner/pun). Match the platform.`;

export async function generatePosts(input: GenerateInput, brand: BrandContext = {}, linkText = ""): Promise<PostIdea[]> {
  const hasBrand = !!(brand.brief || brand.websiteText || brand.samplePosts || brand.notes);
  const personal = input.kind === "personal";

  const businessSystem = `You are Socially, an expert social media strategist for small businesses and creators.
You write posts that sound like the owner wrote them: human, specific, and on-brand. Never generic filler like "Check out our amazing product!".

TRUTH RULES (most important):
- Only state facts that appear in the BRAND KIT, the PAGE TEXT, or the owner's request. Do not invent dates, times, prices, addresses, vendor names, products, quotes, or statistics.
- If a post needs a detail you weren't given, write a clear placeholder in square brackets, like [DATE], [TIME], [TICKET LINK], [VENDOR NAME], and list it in "needsInfo".
- Prefer the most specific real details you have (real names, real places, real products) over vague claims.

VOICE RULES:
- If PAST POSTS are given, copy their style closely: length, punctuation, emoji habits, slang, capitalization, sign-offs, and how they talk to followers.
- Otherwise follow the requested tone.

Respond with ONLY valid JSON, no markdown fences, in this exact shape:
{"posts":[{"idea":"one-line concept","hook":"scroll-stopping first line","caption":"full ready-to-post caption with line breaks as \\n and a clear call to action","hashtags":["#tag"],"visual":"what photo or video to shoot or design","graphicHeadline":"3-7 word headline for a branded graphic","graphicSub":"short supporting line for the graphic, max 10 words (date/place/offer if known)","needsInfo":["[DATE]"]}]}
Write exactly 3 distinct posts, each with a different angle (e.g. behind-the-scenes, customer benefit, story, countdown, spotlight).
Use 8-15 hashtags per post: a mix of broad, niche, and local/community tags. Match the platform's norms for length and style.`;
  const system = personal ? PERSONAL_SYSTEM : businessSystem;

  const brief = brand.brief;
  const brandBlock = hasBrand
    ? [
        personal ? "=== THEIR PROFILE ===" : "=== BRAND KIT ===",
        brand.businessName && `${personal ? "Name" : "Business"}: ${brand.businessName}`,
        brand.instagram && `Instagram: ${brand.instagram}`,
        brief?.summary && `Summary: ${brief.summary}`,
        brief?.facts?.length && `Known facts:\n- ${brief.facts.join("\n- ")}`,
        brief?.voice && `Brand voice: ${brief.voice}`,
        brief?.audience && `Usual audience: ${brief.audience}`,
        brand.notes && `Owner notes:\n${brand.notes}`,
        brand.samplePosts && `PAST POSTS (match this voice):\n${brand.samplePosts.slice(0, 5000)}`,
        brand.websiteText && `Website text (for facts):\n${brand.websiteText.slice(0, 6000)}`,
      ]
        .filter(Boolean)
        .join("\n")
    : "=== PROFILE ===\n(none yet: use placeholders for any specific details you aren't given)";

  const user = `${brandBlock}

${linkText ? `=== PAGE TEXT (from the link the owner shared for this post) ===\n${linkText.slice(0, 8000)}\n\n` : ""}=== THIS REQUEST ===
${
  personal
    ? `Post type: ${input.occasion || "personal post"}
What happened / what's in the photos: ${input.product}`
    : `Business: ${input.business || brand.businessName || "(not given)"}
Promote: ${input.product}
Target audience: ${input.audience || brief?.audience || "(not given, infer a sensible one)"}`
}
Platform: ${input.platform}
Tone: ${input.tone}`;

  const parsed = await askForJson(system, user);
  const posts = Array.isArray(parsed.posts) ? parsed.posts : [];
  return posts.map((p: Partial<PostIdea>) => ({
    idea: String(p.idea || ""),
    hook: String(p.hook || ""),
    caption: String(p.caption || ""),
    hashtags: strings(p.hashtags, 20),
    visual: String(p.visual || ""),
    graphicHeadline: String(p.graphicHeadline || p.hook || ""),
    graphicSub: String(p.graphicSub || ""),
    needsInfo: strings(p.needsInfo, 8),
  }));
}
