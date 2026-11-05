import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { findUserById } from "@/lib/db";
import { createCheckoutSession } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    const user = userId ? await findUserById(userId) : null;
    if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    if (user.has_paid) return NextResponse.json({ url: "/dashboard" });

    const url = await createCheckoutSession({
      userId: user.id,
      email: user.email,
      origin: req.nextUrl.origin,
    });
    return NextResponse.json({ url });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
