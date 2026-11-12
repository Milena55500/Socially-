import { neon } from "@neondatabase/serverless";
import { hashPassword } from "./auth";

// Vercel's Neon integration sets DATABASE_URL (and POSTGRES_URL as a fallback).
function connectionString(): string {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "No database connection found. Add a Neon database to this project in Vercel (Storage tab) so DATABASE_URL is set."
    );
  }
  return url;
}

export function db() {
  return neon(connectionString());
}

export const DEMO_EMAIL = "demo@demo.com";
const DEMO_PASSWORD = "password123!";

let ready: Promise<void> | null = null;

// Creates the tables (if missing) and makes sure the demo account exists with full paid access.
export function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const sql = db();
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          has_paid BOOLEAN NOT NULL DEFAULT FALSE,
          email_verified BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`;
      await sql`
        CREATE TABLE IF NOT EXISTS generations (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          input JSONB NOT NULL,
          output JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`;
      await sql`
        CREATE TABLE IF NOT EXISTS brand_profiles (
          user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          business_name TEXT NOT NULL DEFAULT '',
          website_url TEXT NOT NULL DEFAULT '',
          website_text TEXT NOT NULL DEFAULT '',
          instagram TEXT NOT NULL DEFAULT '',
          sample_posts TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          logo TEXT NOT NULL DEFAULT '',
          colors JSONB NOT NULL DEFAULT '[]',
          brief JSONB,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`;
      const existing = await sql`SELECT id FROM users WHERE email = ${DEMO_EMAIL}`;
      if (existing.length === 0) {
        const hash = await hashPassword(DEMO_PASSWORD);
        await sql`
          INSERT INTO users (email, password_hash, has_paid, email_verified)
          VALUES (${DEMO_EMAIL}, ${hash}, TRUE, TRUE)
          ON CONFLICT (email) DO NOTHING`;
      }
      await sql`UPDATE users SET has_paid = TRUE, email_verified = TRUE WHERE email = ${DEMO_EMAIL}`;
    })().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

export type User = { id: number; email: string; has_paid: boolean };

export async function findUserById(id: number): Promise<User | null> {
  await ensureSchema();
  const rows = await db()`SELECT id, email, has_paid FROM users WHERE id = ${id}`;
  return (rows[0] as User) ?? null;
}

export async function markPaid(userId: number) {
  await ensureSchema();
  await db()`UPDATE users SET has_paid = TRUE WHERE id = ${userId}`;
}

export const FREE_GENERATIONS = 3;

export async function countGenerations(userId: number): Promise<number> {
  const rows = await db()`SELECT COUNT(*)::int AS n FROM generations WHERE user_id = ${userId}`;
  return (rows[0] as { n: number }).n;
}

export type BrandProfile = {
  business_name: string;
  website_url: string;
  website_text: string;
  instagram: string;
  sample_posts: string;
  notes: string;
  logo: string;
  colors: string[];
  brief: import("./ai").BrandBrief | null;
  updated_at?: string;
};

export async function getBrandProfile(userId: number): Promise<BrandProfile | null> {
  await ensureSchema();
  const rows = await db()`
    SELECT business_name, website_url, website_text, instagram, sample_posts, notes, logo, colors, brief, updated_at
    FROM brand_profiles WHERE user_id = ${userId}`;
  return (rows[0] as BrandProfile) ?? null;
}

export async function saveBrandProfile(userId: number, p: BrandProfile) {
  await ensureSchema();
  await db()`
    INSERT INTO brand_profiles
      (user_id, business_name, website_url, website_text, instagram, sample_posts, notes, logo, colors, brief, updated_at)
    VALUES
      (${userId}, ${p.business_name}, ${p.website_url}, ${p.website_text}, ${p.instagram}, ${p.sample_posts},
       ${p.notes}, ${p.logo}, ${JSON.stringify(p.colors)}, ${p.brief ? JSON.stringify(p.brief) : null}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      business_name = EXCLUDED.business_name, website_url = EXCLUDED.website_url,
      website_text = EXCLUDED.website_text, instagram = EXCLUDED.instagram,
      sample_posts = EXCLUDED.sample_posts, notes = EXCLUDED.notes, logo = EXCLUDED.logo,
      colors = EXCLUDED.colors, brief = EXCLUDED.brief, updated_at = NOW()`;
}
