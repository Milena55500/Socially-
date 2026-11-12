"use client";

import { useState } from "react";
import { DEFAULT_COLORS, extractColors, resizeImage } from "./graphics";

export type Brand = {
  businessName: string;
  websiteUrl: string;
  instagram: string;
  samplePosts: string;
  notes: string;
  logo: string;
  colors: string[];
  brief: { summary: string; facts: string[]; voice: string; audience: string; missing: string[] } | null;
  websiteRead: boolean;
};

export const EMPTY_BRAND: Brand = {
  businessName: "",
  websiteUrl: "",
  instagram: "",
  samplePosts: "",
  notes: "",
  logo: "",
  colors: [],
  brief: null,
  websiteRead: false,
};

export default function BrandKit({ brand, onSaved }: { brand: Brand; onSaved: (b: Brand) => void }) {
  const isSetUp = !!(brand.brief || brand.logo || brand.websiteUrl);
  const [editing, setEditing] = useState(!isSetUp);
  const [form, setForm] = useState<Brand>(brand);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);

  function set<K extends keyof Brand>(key: K, value: Brand[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onLogo(file?: File) {
    if (!file) return;
    setError("");
    try {
      const logo = await resizeImage(file, 512, "image/png");
      const colors = await extractColors(logo);
      setForm((f) => ({ ...f, logo, colors }));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function save(extra: { refreshWebsite?: boolean; rebuildBrief?: boolean } = {}) {
    setSaving(true);
    setError("");
    setWarnings([]);
    try {
      const res = await fetch("/api/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't save your Brand Kit.");
      const saved = { ...EMPTY_BRAND, ...data.brand } as Brand;
      setForm(saved);
      onSaved(saved);
      setWarnings(data.warnings || []);
      setEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const colors = form.colors.length ? form.colors : DEFAULT_COLORS;

  if (!editing) {
    const b = brand.brief;
    return (
      <section className="card brand-kit">
        <div className="brand-head">
          {brand.logo ? <img src={brand.logo} alt="" className="brand-logo" /> : <div className="brand-logo empty">Logo</div>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="eyebrow small-eyebrow">Your Brand Kit</p>
            <h2>{brand.businessName || "Your business"}</h2>
            <p className="muted small">
              {[brand.websiteUrl && (brand.websiteRead ? "Website read ✓" : "Website not readable"), brand.samplePosts && "Past posts ✓", brand.instagram]
                .filter(Boolean)
                .join(" · ") || "Add your website or past posts so Socially gets the facts right."}
            </p>
          </div>
          <div className="swatches">
            {(brand.colors.length ? brand.colors : DEFAULT_COLORS).map((c) => <span key={c} style={{ background: c }} title={c} />)}
          </div>
          <button className="btn btn-ghost" onClick={() => setEditing(true)}>Edit</button>
        </div>
        {warnings.map((w) => <p key={w} className="notice">{w}</p>)}
        {b && (
          <details className="learned" open={!!warnings.length || undefined}>
            <summary>What Socially learned about you <span className="muted small">(check it&apos;s right)</span></summary>
            <p>{b.summary}</p>
            {b.facts.length > 0 && (
              <ul>{b.facts.map((f) => <li key={f}>{f}</li>)}</ul>
            )}
            {b.voice && <p className="small"><strong>Your voice:</strong> {b.voice}</p>}
            {b.missing.length > 0 && (
              <p className="small muted"><strong>Still missing:</strong> {b.missing.join(", ")}. Add these in Notes, or mention them when you create posts.</p>
            )}
          </details>
        )}
      </section>
    );
  }

  return (
    <section className="card brand-kit gen-form">
      <div>
        <p className="eyebrow small-eyebrow">Step 1 · Brand Kit</p>
        <h2>Teach Socially about your business</h2>
        <p className="muted small">
          Do this once. Socially reads your website and past posts so it uses your real details and writes the way you do, instead of making things up.
        </p>
      </div>
      <div className="grid-2">
        <label>
          Business or brand name
          <input value={form.businessName} onChange={(e) => set("businessName", e.target.value)} placeholder="e.g. Pop Up Ave" />
        </label>
        <label>
          Website
          <input value={form.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} placeholder="e.g. popupave.com" inputMode="url" />
        </label>
      </div>
      <label>
        Instagram handle <span className="muted small">(used in captions and on your graphics)</span>
        <input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@yourbusiness" />
      </label>
      <label>
        Paste 3–5 of your past posts <span className="muted small">(this is how Socially learns your voice)</span>
        <textarea
          rows={6}
          value={form.samplePosts}
          onChange={(e) => set("samplePosts", e.target.value)}
          placeholder={"Open a post on Instagram → tap ··· → Copy, then paste here. Separate posts with a blank line.\n\nInstagram doesn't let apps read accounts directly, so copy-paste is the reliable way."}
        />
      </label>
      <label>
        Anything else we should know? <span className="muted small">(upcoming dates, prices, location, what makes you different)</span>
        <textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="e.g. Next market is Saturday 12/6, 10–4, in the library courtyard. 40+ local makers, free entry." />
      </label>
      <div className="logo-row">
        <div className="logo-drop">
          {form.logo ? <img src={form.logo} alt="Your logo" /> : <span className="muted small">No logo yet</span>}
        </div>
        <div className="logo-actions">
          <label className="file-btn btn btn-ghost">
            {form.logo ? "Change logo" : "Upload logo"}
            <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => onLogo(e.target.files?.[0])} />
          </label>
          <div className="color-row">
            {colors.slice(0, 2).map((c, i) => (
              <label key={i} className="color-pick small">
                <input
                  type="color"
                  value={c}
                  onChange={(e) => {
                    const next = [...colors];
                    next[i] = e.target.value;
                    set("colors", next);
                  }}
                />
                {i === 0 ? "Main color" : "Accent"}
              </label>
            ))}
          </div>
          <p className="muted small">We pull your colors from the logo. Tap a swatch to change it.</p>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="row-gap">
        <button className="btn btn-primary" disabled={saving} onClick={() => save()}>
          {saving ? "Reading your website…" : "Save Brand Kit"}
        </button>
        {isSetUp && (
          <>
            {form.websiteUrl && (
              <button className="btn btn-ghost" disabled={saving} onClick={() => save({ refreshWebsite: true, rebuildBrief: true })}>
                Re-read website
              </button>
            )}
            <button className="btn btn-ghost" disabled={saving} onClick={() => { setForm(brand); setEditing(false); }}>
              Cancel
            </button>
          </>
        )}
      </div>
    </section>
  );
}
