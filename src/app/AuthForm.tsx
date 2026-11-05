"use client";

import { useState } from "react";
import Link from "next/link";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isSignup = mode === "signup";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      window.location.href = "/dashboard";
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <header className="nav">
        <Link href="/" className="logo">
          <span className="logo-dot" /> Socially
        </Link>
      </header>
      <main className="auth">
        <form className="card auth-card" onSubmit={onSubmit}>
          <h2>{isSignup ? "Create your account" : "Welcome back"}</h2>
          <p className="muted">
            {isSignup ? "Start with 3 free post generations." : "Log in to keep creating."}
          </p>
          <label>
            Email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              minLength={isSignup ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignup ? "new-password" : "current-password"}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" disabled={loading}>
            {loading ? "One sec…" : isSignup ? "Sign up" : "Log in"}
          </button>
          <p className="muted small">
            {isSignup ? (
              <>Already have an account? <Link href="/login">Log in</Link></>
            ) : (
              <>New here? <Link href="/signup">Create an account</Link></>
            )}
          </p>
        </form>
      </main>
    </div>
  );
}
