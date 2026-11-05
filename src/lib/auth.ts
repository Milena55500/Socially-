import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "socially_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  const fallback = process.env.DATABASE_URL || process.env.POSTGRES_URL || "socially-dev-secret";
  return createHash("sha256").update("socially-session:" + fallback).digest("hex");
}

function scryptAsync(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key)))
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await scryptAsync(password, salt);
  return `scrypt:${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hex] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hex) return false;
  const key = await scryptAsync(password, salt);
  const expected = Buffer.from(hex, "hex");
  return expected.length === key.length && timingSafeEqual(expected, key);
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export async function setSession(userId: number) {
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `${userId}.${expires}`;
  const store = await cookies();
  store.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE);
}

// Returns the logged-in user's id, or null.
export async function getSessionUserId(): Promise<number | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [id, expires, sig] = parts;
  const expected = sign(`${id}.${expires}`);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  if (Number(expires) < Date.now() / 1000) return null;
  const userId = Number(id);
  return Number.isInteger(userId) ? userId : null;
}

export function normalizeEmail(email: unknown): string {
  return String(email ?? "").trim().toLowerCase();
}
