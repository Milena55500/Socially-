"use client";

import { useState } from "react";
import Link from "next/link";
import BrandKit, { Brand, EMPTY_BRAND } from "./BrandKit";
import GraphicMaker from "./GraphicMaker";

type Post = {
  idea: string;
  hook: string;
  caption: string;
  hashtags: string[];
  visual: string;
  graphicHeadline?: string;
  graphicSub?: string;
  needsInfo?: string[];
};
type HistoryItem = {
  id: number;
  input: { business: string; product: string; platform: string; tone: string; link?: string; occasion?: string };
  output: Post[];
  created_at: string;
};

const PLATFORMS = ["Instagram", "Instagram Story", "TikTok", "LinkedIn", "X (Twitter)", "Facebook", "Pinterest"];
const TONES = ["Chill", "Funny", "Hype", "Sentimental", "Proud but humble", "Friendly", "Professional", "Bold"];

// What the post is about. "business" posts get the promo fields; the rest are personal posts.
const OCCASIONS = [
  { key: "graduation", label: "🎓 Graduation / grad pics", kind: "personal", tone: "Sentimental",
    prompt: "What are the pics of, and what does this moment mean to you?",
    placeholder: "e.g. grad pics on Old Main lawn with my roommates. 4 years, 2 major changes, finally done. thank you mom" },
  { key: "nightout", label: "🌙 Night out / weekend", kind: "personal", tone: "Funny",
    prompt: "What happened? Describe the photos",
    placeholder: "e.g. formal with the girls, matching outfits, ended the night at 2am diner run. photo dump" },
  { key: "win", label: "🏆 Accomplishment / big news", kind: "personal", tone: "Proud but humble",
    prompt: "What did you accomplish? Who do you want to thank?",
    placeholder: "e.g. got the summer marketing internship at a startup in NYC. shoutout to my professor for the rec" },
  { key: "dump", label: "📸 Photo dump / everyday", kind: "personal", tone: "Chill",
    prompt: "What's in the photos?",
    placeholder: "e.g. first snow on campus, iced coffee anyway, library all-nighter, football game" },
  { key: "business", label: "🛍️ My business, club or event", kind: "business", tone: "Friendly",
    prompt: "What do you want to promote?",
    placeholder: "e.g. Our holiday market this Saturday. Spotlight 3 of our vendors and remind people entry is free" },
] as const;
type OccasionKey = (typeof OCCASIONS)[number]["key"];

export default function Dashboard(props: {
  email: string;
  hasPaid: boolean;
  freeLeft: number;
  price: string;
  justPaid: boolean;
  canceled: boolean;
  history: HistoryItem[];
  brand: Brand | null;
}) {
  const [brand, setBrand] = useState<Brand>(props.brand ? { ...EMPTY_BRAND, ...props.brand } : EMPTY_BRAND);
  const [openGraphic, setOpenGraphic] = useState<string | null>(null);
  const [form, setForm] = useState({
    business: props.brand?.businessName || "",
    product: "",
    link: "",
    audience: "",
    platform: "Instagram",
    tone: "Sentimental",
    occasion: "graduation" as OccasionKey,
  });
  const occasion = OCCASIONS.find((o) => o.key === form.occasion) || OCCASIONS[0];
  const isBusiness = occasion.kind === "business";
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
        body: JSON.stringify({ ...form, kind: occasion.kind, occasion: occasion.label.replace(/^\S+\s/, "") }),
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

        <BrandKit
          brand={brand}
          onSaved={(b) => {
            setBrand(b);
            if (b.businessName) setForm((f) => ({ ...f, business: f.business || b.businessName }));
          }}
        />

        <form className="card gen-form" onSubmit={generate}>
          <div>
            <p className="eyebrow small-eyebrow">Step 2 · Posts</p>
            <h2>Create posts</h2>
            {!brand.samplePosts && !brand.brief && (
              <p className="muted small">Paste a few of your old captions in Step 1 so these sound like you. Anything Socially doesn&apos;t know gets a [placeholder] instead of a made-up detail.</p>
            )}
          </div>
          <div className="chips" role="radiogroup" aria-label="What's this post about?">
            {OCCASIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                role="radio"
                aria-checked={form.occasion === o.key}
                className={form.occasion === o.key ? "chip on" : "chip"}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    occasion: o.key,
                    tone: o.tone,
                  }))
                }
              >
                {o.label}
              </button>
            ))}
          </div>
          {isBusiness && (
            <div className="grid-2">
              <label>
                Business, club or event name
                <input value={form.business} onChange={(e) => set("business", e.target.value)} placeholder="e.g. Pop Up Ave" />
              </label>
              <label>
                Who it&apos;s for
                <input value={form.audience} onChange={(e) => set("audience", e.target.value)} placeholder="e.g. college students in State College" />
              </label>
            </div>
          )}
          <label>
            {occasion.prompt}
            <textarea
              required
              rows={3}
              value={form.product}
              onChange={(e) => set("product", e.target.value)}
              placeholder={occasion.placeholder}
            />
          </label>
          {isBusiness && (
            <label>
              Link with details <span className="muted small">(optional: event page, product page, ticket link)</span>
              <input value={form.link} onChange={(e) => set("link", e.target.value)} placeholder="https://…" inputMode="url" />
            </label>
          )}
          {occasion.key === "win" && (
            <p className="muted small">Tip: pick LinkedIn below and you&apos;ll get a more professional version too.</p>
          )}
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
            {loading ? "Writing your captions…" : paywall && !props.hasPaid ? "Upgrade to keep creating" : isBusiness ? "Generate 3 posts" : "Write 3 captions"}
          </button>
        </form>

        {posts.length > 0 && (
          <section className="results">
            {posts.map((p, i) => {
              const full = p.hashtags.length ? `${p.caption}\n\n${p.hashtags.join(" ")}` : p.caption;
              return (
                <article key={i} className="card post">
                  <p className="eyebrow small-eyebrow">Option {i + 1} · {p.idea}</p>
                  <p className="hook">{p.hook}</p>
                  <p className="caption">{p.caption}</p>
                  {p.hashtags.length > 0 && <p className="tags">{p.hashtags.join(" ")}</p>}
                  <p className="muted small"><strong>Visual:</strong> {p.visual}</p>
                  {p.needsInfo && p.needsInfo.length > 0 && (
                    <p className="needs small">Fill in before posting: {p.needsInfo.join(", ")}</p>
                  )}
                  <div className="row-gap">
                    <button type="button" className="btn btn-ghost" onClick={() => copy(full, `new-${i}`)}>
                      {copied === `new-${i}` ? "Copied!" : p.hashtags.length ? "Copy caption + hashtags" : "Copy caption"}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => setOpenGraphic(openGraphic === `new-${i}` ? null : `new-${i}`)}>
                      {openGraphic === `new-${i}` ? "Hide graphic" : "Make graphic"}
                    </button>
                  </div>
                  {openGraphic === `new-${i}` && (
                    <GraphicMaker
                      headline={p.graphicHeadline || p.hook}
                      sub={p.graphicSub || ""}
                      platform={form.platform}
                      defaultTemplate={isBusiness ? "bold" : "photo"}
                      businessName={brand.businessName}
                      instagram={brand.instagram}
                      logo={brand.logo}
                      colors={brand.colors}
                    />
                  )}
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
                  <strong>{h.input.occasion || h.input.business || "Untitled"}</strong>{" "}
                  <span className="muted small">
                    · {h.input.platform} · {new Date(h.created_at).toLocaleDateString()}
                  </span>
                  <p className="muted small">{h.input.product}</p>
                </summary>
                {h.output.map((p, i) => (
                  <div key={i} className="history-post">
                    <p className="hook">{p.hook}</p>
                    <p className="caption">{p.caption}</p>
                    {p.hashtags.length > 0 && <p className="tags">{p.hashtags.join(" ")}</p>}
                    <div className="row-gap">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => copy(`${p.caption}\n\n${p.hashtags.join(" ")}`, `${h.id}-${i}`)}
                      >
                        {copied === `${h.id}-${i}` ? "Copied!" : "Copy"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setOpenGraphic(openGraphic === `${h.id}-${i}` ? null : `${h.id}-${i}`)}
                      >
                        {openGraphic === `${h.id}-${i}` ? "Hide graphic" : "Make graphic"}
                      </button>
                    </div>
                    {openGraphic === `${h.id}-${i}` && (
                      <GraphicMaker
                        headline={p.graphicHeadline || p.hook}
                        sub={p.graphicSub || ""}
                        platform={h.input.platform}
                        businessName={brand.businessName}
                        instagram={brand.instagram}
                        logo={brand.logo}
                        colors={brand.colors}
                      />
                    )}
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
