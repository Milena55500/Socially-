# Socially

AI-powered social media assistant for small businesses and content creators.
Describe what you're promoting and get three ready-to-post ideas with hooks, captions, hashtags, and visual suggestions.

## Stack
- Next.js on Vercel
- Neon Postgres (users + saved posts). Tables and the demo account are created automatically on first request.
- Anthropic Claude API for post generation (server-side only)
- Stripe Checkout for payment (3 free generations, then upgrade)

## Environment variables (Vercel → Settings → Environment Variables)
| Name | Where it comes from |
| --- | --- |
| `DATABASE_URL` | Added automatically when you connect Neon in Vercel Storage |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys (starts with `sk_test_` in test mode) |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks, endpoint `https://<your-site>/api/stripe-webhook`, event `checkout.session.completed` |
| `PRICE_CENTS` | Optional. Price in cents, default 900 ($9) |
| `AUTH_SECRET` | Optional. Any long random string used to sign login cookies |

## Demo account
`demo@demo.com` / `password123!` (created automatically with full paid access)

## Run it locally
```bash
npm install
npm run dev
```
