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
