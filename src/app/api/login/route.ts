import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";
import { normalizeEmail, setSession, verifyPassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = normalizeEmail(body.email);
    const password = String(body.password ?? "");

    await ensureSchema();
    const rows = await db()`SELECT id, password_hash FROM users WHERE email = ${email}`;
    const user = rows[0] as { id: number; password_hash: string } | undefined;
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });
    }
    await setSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
