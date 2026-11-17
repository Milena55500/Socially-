// Reads a public web page (a business's website or event page) and turns it into plain text
// that the AI can use as facts. Runs on the server only.

const MAX_HTML = 1_500_000; // bytes we're willing to read per page
const MAX_TEXT = 7000; // characters of text we keep per page
const TIMEOUT_MS = 8000;

export function normalizeUrl(raw: string): string | null {
  let value = String(raw || "").trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = "https://" + value;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    // Don't let people point the server at itself or a private network.
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      /^\d+\.\d+\.\d+\.\d+$/.test(host) ||
      host.includes(":") ||
      !host.includes(".")
    ) {
      return null;
    }
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&ndash;|&mdash;/g, "-")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function meta(html: string, name: string): string {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`,
    "i"
  );
  const m = html.match(re);
  return decodeEntities((m?.[1] || m?.[2] || "").trim());
}

export function htmlToText(html: string): { title: string; description: string; text: string } {
  const title = decodeEntities((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim());
  const description = meta(html, "description") || meta(html, "og:description");
  const body = html
    .replace(/<(script|style|noscript|svg|iframe|template)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/section|\/article|\/tr)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  const text = decodeEntities(body)
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 1)
    .filter((line, i, arr) => arr.indexOf(line) === i) // drop repeated nav/footer lines
    .join("\n")
    .slice(0, MAX_TEXT);
  return { title, description, text };
}

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; SociallyBot/1.0; +https://socially.app)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) throw new Error(`That page returned an error (${res.status}).`);
    const type = res.headers.get("content-type") || "";
    if (!type.includes("html")) throw new Error("That link isn't a web page.");
    const html = await res.text();
    return html.slice(0, MAX_HTML);
  } catch (err) {
    if ((err as Error).name === "AbortError") throw new Error("That website took too long to load.");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Finds a few useful pages on the same site (about, events, vendors, FAQ, shop...).
function usefulLinks(html: string, base: string): string[] {
  const baseUrl = new URL(base);
  const wanted = /(about|story|event|market|vendor|maker|faq|shop|menu|service|schedule|dates|visit|info)/i;
  const found: string[] = [];
  for (const m of html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const url = new URL(m[1], baseUrl);
      if (url.hostname !== baseUrl.hostname) continue;
      const label = m[2].replace(/<[^>]+>/g, " ");
      if (!wanted.test(url.pathname) && !wanted.test(label)) continue;
      url.hash = "";
      url.search = "";
      const s = url.toString();
      if (s !== baseUrl.toString() && !found.includes(s)) found.push(s);
    } catch {
      /* ignore bad links */
    }
    if (found.length >= 3) break;
  }
  return found;
}

// Reads the page plus up to 3 related pages on the same site. Returns text for the AI.
export async function readWebsite(rawUrl: string, opts: { followLinks?: boolean } = {}): Promise<string> {
  const url = normalizeUrl(rawUrl);
  if (!url) throw new Error("That doesn't look like a public website address.");
  const html = await fetchHtml(url);
  const main = htmlToText(html);
  const parts = [
    `PAGE: ${url}`,
    main.title && `Title: ${main.title}`,
    main.description && `Description: ${main.description}`,
    main.text,
  ].filter(Boolean) as string[];

  if (opts.followLinks !== false) {
    const extra = await Promise.allSettled(
      usefulLinks(html, url).map(async (link) => {
        const t = htmlToText(await fetchHtml(link));
        return `PAGE: ${link}\n${t.title ? `Title: ${t.title}\n` : ""}${t.text.slice(0, 3500)}`;
      })
    );
    for (const r of extra) if (r.status === "fulfilled") parts.push(r.value);
  }

  const text = parts.join("\n\n").slice(0, 16000);
  if (text.replace(/PAGE:.*|Title:.*/g, "").trim().length < 80) {
    throw new Error(
      "We couldn't read much text on that site (it may be built with a page builder that loads content later). Paste a few lines about your business in the notes box instead."
    );
  }
  return text;
}
