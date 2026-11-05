"use client";

import { useState } from "react";
import Link from "next/link";

type Post = { idea: string; hook: string; caption: string; hashtags: string[]; visual: string };
type HistoryItem = {
  id: number;
  input: { business: string; product: string; platform: string; tone: string };
  output: Post[];
  created_at: string;
};

const PLATFORMS = ["Instagram", "TikTok", "Facebook", "LinkedIn", "X (Twitter)", "Pinterest"];
const TONES = ["Friendly", "Playful", "Professional", "Bold", "Inspirational", "Luxury"];

export default function Dashboard(props: {
  email: string;
  hasPaid: boolean;
  freeLeft: number;
  price: string;
  justPaid: boolean;
  canceled: boolean;
  history: HistoryItem[];
}) {
  const [form, setForm] = useState({
    business: "",
    product: "",
    audience: "",
    platform: "Instagram",
    tone: "Friendly",
  });
  const [posts, setPosts] = useState<Post[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>(props.history);
  const [freeLeft, setFreeLeft] = useState(props.freeLeft);
  const [error, setError] = useState("");
  const [paywall, setPaywall] = useState(!props.hasPaid && props.freeLeft === 0);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.paywall) setPaywall(true);
        throw new Error(data.error || "Something went wrong.");
      }
      setPosts(data.posts);
      setHistory((h) => [
        { id: data.id, input: form, output: data.posts, created_at: new Date().toISOString() },
        ...h,
      ]);
      if (!props.hasPaid) {
        const left = Math.max(0, freeLeft - 1);
        setFreeLeft(left);
        if (left === 0) setPaywall(true);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function upgrade() {
    setPaying(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start checkout.");
      window.location.href = data.url;
    } catch (err) {
      setError((err as Error).message);
      setPaying(false);
    }
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/";
  }

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="page">
      <header className="nav nav-row">
        <Link href="/" className="logo">
          <span className="logo-dot" /> Socially
        </Link>
        <div className="nav-links">
          {props.hasPaid ? (
            <span className="badge">Pro</span>
          ) : (
            <span className="muted small">{freeLeft} free left</span>
          )}
          <span className="muted small hide-sm">{props.email}</span>
          <button className="btn btn-ghost" onClick={logout}>Log out</button>
        </div>
      </header>

      <main className="dash">
        {props.justPaid && <p className="notice success">Payment received. You now have Socially Pro!</p>}
        {props.canceled && <p className="notice">Checkout canceled. You weren&apos;t charged.</p>}

        {!props.hasPaid && (
          <div className="card upgrade">
            <div>
              <strong>Upgrade to Socially Pro</strong>
              <p className="muted small">Unlimited post ideas, captions, and hashtags for ${props.price}.</p>
            </div>
            <button className="btn btn-primary" onClick={upgrade} disabled={paying}>
              {paying ? "Opening checkout…" : `Upgrade for $${props.price}`}
            </button>
          </div>
        )}

        <form className="card gen-form" onSubmit={generate}>
          <h2>Create posts</h2>
          <div className="grid-2">
            <label>
              Business or brand name
              <input value={form.business} onChange={(e) => set("business", e.target.value)} placeholder="e.g. Maple & Bean Coffee" />
            </label>
            <label>
              Who it&apos;s for
              <input value={form.audience} onChange={(e) => set("audience", e.target.value)} placeholder="e.g. college students in State College" />
            </label>
          </div>
          <label>
            What do you want to promote?
            <textarea
              required
              rows={3}
              value={form.product}
              onChange={(e) => set("product", e.target.value)}
              placeholder="e.g. Our new pumpkin oat latte, only available through November, 20% off with a student ID"
            />
          </label>
          <div className="grid-2">
            <label>
              Platform
              <select value={form.platform} onChange={(e) => set("platform", e.target.value)}>
                {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label>
              Tone
              <select value={form.tone} onChange={(e) => set("tone", e.target.value)}>
                {TONES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" disabled={loading || (paywall && !props.hasPaid)}>
            {loading ? "Writing your posts…" : paywall && !props.hasPaid ? "Upgrade to keep creating" : "Generate 3 posts"}
          </button>
        </form>

        {posts.length > 0 && (
          <section className="results">
            {posts.map((p, i) => {
              const full = `${p.caption}\n\n${p.hashtags.join(" ")}`;
              return (
                <article key={i} className="card post">
                  <p className="eyebrow small-eyebrow">Option {i + 1} · {p.idea}</p>
                  <p className="hook">{p.hook}</p>
                  <p className="caption">{p.caption}</p>
                  <p className="tags">{p.hashtags.join(" ")}</p>
                  <p className="muted small"><strong>Visual:</strong> {p.visual}</p>
                  <button type="button" className="btn btn-ghost" onClick={() => copy(full, `new-${i}`)}>
                    {copied === `new-${i}` ? "Copied!" : "Copy caption + hashtags"}
                  </button>
                </article>
              );
            })}
          </section>
        )}

        {history.length > 0 && (
          <section className="history">
            <h3>Your saved posts</h3>
            {history.map((h) => (
              <details key={h.id} className="card">
                <summary>
                  <strong>{h.input.business || "Untitled"}</strong>{" "}
                  <span className="muted small">
                    · {h.input.platform} · {new Date(h.created_at).toLocaleDateString()}
                  </span>
                  <p className="muted small">{h.input.product}</p>
                </summary>
                {h.output.map((p, i) => (
                  <div key={i} className="history-post">
                    <p className="hook">{p.hook}</p>
                    <p className="caption">{p.caption}</p>
                    <p className="tags">{p.hashtags.join(" ")}</p>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => copy(`${p.caption}\n\n${p.hashtags.join(" ")}`, `${h.id}-${i}`)}
                    >
                      {copied === `${h.id}-${i}` ? "Copied!" : "Copy"}
                    </button>
                  </div>
                ))}
              </details>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
