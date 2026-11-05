import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { countGenerations, db, findUserById, FREE_GENERATIONS } from "@/lib/db";
import { generatePosts, GenerateInput } from "@/lib/ai";

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
    };
    if (!input.product.trim()) {
      return NextResponse.json({ error: "Tell us about the product you want to post about." }, { status: 400 });
    }

    const posts = await generatePosts(input);
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
