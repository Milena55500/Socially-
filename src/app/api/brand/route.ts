import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { BrandProfile, getBrandProfile, saveBrandProfile } from "@/lib/db";
import { buildBrandBrief } from "@/lib/ai";
import { normalizeUrl, readWebsite } from "@/lib/web";

export const maxDuration = 60;

const MAX_LOGO = 700_000; // characters of a data: URL (~500 KB image)
const HEX = /^#[0-9a-f]{6}$/i;

// What the dashboard gets back (the raw website text stays on the server).
function toClient(p: BrandProfile | null) {
  if (!p) return null;
  return {
    businessName: p.business_name,
    websiteUrl: p.website_url,
    instagram: p.instagram,
    samplePosts: p.sample_posts,
    notes: p.notes,
    logo: p.logo,
    colors: p.colors,
    brief: p.brief,
    websiteRead: p.website_text.length > 0,
    updatedAt: p.updated_at,
  };
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  return NextResponse.json({ brand: toClient(await getBrandProfile(userId)) });
}

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

    const body = await req.json();
    const existing = await getBrandProfile(userId);

    const logo = String(body.logo ?? "");
    if (logo && (!/^data:image\/(png|jpeg|webp);base64,/.test(logo) || logo.length > MAX_LOGO)) {
      return NextResponse.json({ error: "Logo must be a PNG, JPG or WebP under 500 KB." }, { status: 400 });
    }

    const rawUrl = String(body.websiteUrl ?? "").trim().slice(0, 500);
    const websiteUrl = rawUrl ? normalizeUrl(rawUrl) : "";
    if (rawUrl && !websiteUrl) {
      return NextResponse.json({ error: "That doesn't look like a public website address." }, { status: 400 });
    }

    const profile: BrandProfile = {
      business_name: String(body.businessName ?? "").slice(0, 200),
      website_url: websiteUrl || "",
      website_text: existing?.website_url === websiteUrl ? existing?.website_text || "" : "",
      instagram: String(body.instagram ?? "").trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "@").replace(/\/$/, "").slice(0, 100),
      sample_posts: String(body.samplePosts ?? "").slice(0, 8000),
      notes: String(body.notes ?? "").slice(0, 3000),
      logo,
      colors: (Array.isArray(body.colors) ? body.colors : []).map(String).filter((c: string) => HEX.test(c)).slice(0, 3),
      brief: existing?.brief ?? null,
    };

    // Re-read the website if it's new, or the user asked us to.
    const warnings: string[] = [];
    if (profile.website_url && (!profile.website_text || body.refreshWebsite)) {
      try {
        profile.website_text = await readWebsite(profile.website_url);
      } catch (err) {
        warnings.push((err as Error).message);
      }
    }

    // Rebuild the brand brief whenever the text sources changed (or on request).
    const sourcesChanged =
      !existing ||
      existing.website_text !== profile.website_text ||
      existing.sample_posts !== profile.sample_posts ||
      existing.notes !== profile.notes ||
      existing.business_name !== profile.business_name;
    const hasSources = !!(profile.website_text || profile.sample_posts.trim() || profile.notes.trim());
    if (hasSources && (sourcesChanged || body.rebuildBrief || !profile.brief)) {
      try {
        profile.brief = await buildBrandBrief({
          businessName: profile.business_name,
          instagram: profile.instagram,
          websiteText: profile.website_text,
          samplePosts: profile.sample_posts,
          notes: profile.notes,
        });
      } catch (err) {
        warnings.push("Saved, but we couldn't summarize your brand yet: " + (err as Error).message);
      }
    }
    if (!hasSources) profile.brief = null;

    await saveBrandProfile(userId, profile);
    return NextResponse.json({ brand: toClient(await getBrandProfile(userId)), warnings });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
