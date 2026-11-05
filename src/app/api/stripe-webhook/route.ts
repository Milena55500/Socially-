import { NextResponse } from "next/server";
import { markPaid } from "@/lib/db";
import { verifyWebhook } from "@/lib/stripe";

// Stripe calls this after a successful payment. Set STRIPE_WEBHOOK_SECRET in Vercel.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook secret not set" }, { status: 500 });

  const raw = await req.text();
  if (!verifyWebhook(raw, req.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(raw);
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    const userId = Number(session.client_reference_id || session.metadata?.user_id);
    if (session.payment_status === "paid" && Number.isInteger(userId)) {
      await markPaid(userId);
    }
  }
  return NextResponse.json({ received: true });
}
