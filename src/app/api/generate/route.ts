import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { countGenerations, db, findUserById, FREE_GENERATIONS, getBrandProfile } from "@/lib/db";
import { generatePosts, GenerateInput } from "@/lib/ai";
import { readWebsite } from "@/lib/web";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId();
    const user = userId ? await findUserById(userId) : null;
    if (!user) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    }

    if (!user.has_paid) {
      const used = await countGenerations(user.id);
      if (used >= FREE_GENERATIONS) {
        return NextResponse.json(
          { error: "You've used your free generations. Upgrade to Pro for unlimited posts.", paywall: true },
          { status: 402 }
        );
      }
    }

    const body = await req.json();
    const input: GenerateInput = {
      business: String(body.business ?? "").slice(0, 200),
      product: String(body.product ?? "").slice(0, 1500),
      audience: String(body.audience ?? "").slice(0, 300),
      platform: String(body.platform ?? "Instagram").slice(0, 40),
      tone: String(body.tone ?? "Friendly").slice(0, 40),
      link: String(body.link ?? "").trim().slice(0, 500),
    };
    if (!input.product.trim()) {
      return NextResponse.json({ error: "Tell us about the product you want to post about." }, { status: 400 });
    }

    // Pull in everything we know about this business so the posts are true and sound like them.
    const brand = await getBrandProfile(user.id);
    let linkText = "";
    if (input.link) {
      try {
        linkText = await readWebsite(input.link, { followLinks: false });
      } catch (err) {
        return NextResponse.json(
          { error: `We couldn't read that link: ${(err as Error).message} Try another link, or paste the details instead.` },
          { status: 400 }
        );
      }
    }

    const posts = await generatePosts(
      input,
      brand
        ? {
            businessName: brand.business_name,
            instagram: brand.instagram,
            websiteText: brand.website_text,
            samplePosts: brand.sample_posts,
            notes: brand.notes,
            brief: brand.brief,
          }
        : {},
      linkText
    );
    if (posts.length === 0) throw new Error("The AI didn't return any posts. Please try again.");
    const rows = await db()`
      INSERT INTO generations (user_id, input, output)
      VALUES (${user.id}, ${JSON.stringify(input)}, ${JSON.stringify(posts)})
      RETURNING id, created_at`;
    return NextResponse.json({ posts, id: (rows[0] as { id: number }).id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
