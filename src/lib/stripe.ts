import { createHmac, timingSafeEqual } from "crypto";

// Small Stripe helpers using the REST API directly (no SDK needed).

export const PRICE_CENTS = Number(process.env.PRICE_CENTS || 900);

function stripeKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set in Vercel environment variables.");
  return key;
}

async function stripe(path: string, init: RequestInit = {}) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${stripeKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(init.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Stripe request failed");
  return data;
}

export async function createCheckoutSession(opts: {
  userId: number;
  email: string;
  origin: string;
}): Promise<string> {
  const body = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(PRICE_CENTS),
    "line_items[0][price_data][product_data][name]": "Socially Pro",
    "line_items[0][price_data][product_data][description]":
      "Unlimited AI post ideas, captions, and hashtags",
    client_reference_id: String(opts.userId),
    customer_email: opts.email,
    "metadata[user_id]": String(opts.userId),
    success_url: `${opts.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${opts.origin}/dashboard?canceled=1`,
  });
  const session = await stripe("checkout/sessions", { method: "POST", body });
  return session.url as string;
}

// Used on the success redirect so access unlocks even before the webhook arrives.
export async function paidUserIdForSession(sessionId: string): Promise<number | null> {
  const session = await stripe(`checkout/sessions/${encodeURIComponent(sessionId)}`);
  if (session.payment_status !== "paid") return null;
  const id = Number(session.client_reference_id);
  return Number.isInteger(id) ? id : null;
}

export function verifyWebhook(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i), p.slice(i + 1)];
    })
  );
  const t = parts["t"];
  if (!t) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const signatures = header
    .split(",")
    .filter((p) => p.startsWith("v1="))
    .map((p) => p.slice(3));
  const tooOld = Math.abs(Date.now() / 1000 - Number(t)) > 300;
  return (
    !tooOld &&
    signatures.some(
      (s) => s.length === expected.length && timingSafeEqual(Buffer.from(s), Buffer.from(expected))
    )
  );
}
