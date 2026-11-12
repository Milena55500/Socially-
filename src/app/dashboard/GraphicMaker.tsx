"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_COLORS, drawGraphic, loadImage, resizeImage, SIZES, SizeKey, Template } from "./graphics";

const TEMPLATES: { key: Template; label: string }[] = [
  { key: "bold", label: "Bold" },
  { key: "photo", label: "Photo" },
  { key: "clean", label: "Clean" },
];

function defaultSize(platform: string): SizeKey {
  if (/tiktok/i.test(platform)) return "story";
  if (/pinterest/i.test(platform)) return "story";
  if (/instagram|facebook/i.test(platform)) return "portrait";
  return "square";
}

export default function GraphicMaker(props: {
  headline: string;
  sub: string;
  platform: string;
  businessName: string;
  instagram: string;
  logo: string;
  colors: string[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [template, setTemplate] = useState<Template>("bold");
  const [size, setSize] = useState<SizeKey>(defaultSize(props.platform));
  const [headline, setHeadline] = useState(props.headline);
  const [sub, setSub] = useState(props.sub);
  const [photo, setPhoto] = useState<string>("");
  const [error, setError] = useState("");

  const colors = props.colors.length ? props.colors : DEFAULT_COLORS;
  const footer = props.instagram || props.businessName || "";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (document.fonts?.ready) await document.fonts.ready;
        const [logoImg, photoImg] = await Promise.all([
          props.logo ? loadImage(props.logo) : Promise.resolve(null),
          photo ? loadImage(photo) : Promise.resolve(null),
        ]);
        if (cancelled || !canvasRef.current) return;
        drawGraphic(canvasRef.current, {
          template,
          size,
          headline,
          sub,
          footer,
          colors,
          logo: logoImg,
          photo: photoImg,
          font: getComputedStyle(document.body).fontFamily || "sans-serif",
        });
      } catch (err) {
        setError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [template, size, headline, sub, footer, photo, props.logo, colors.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addPhoto(file?: File) {
    if (!file) return;
    setError("");
    try {
      setPhoto(await resizeImage(file, 1920, "image/jpeg"));
      setTemplate("photo");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      const name = (headline || "socially-post").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
      a.href = URL.createObjectURL(blob);
      a.download = `${name || "socially-post"}-${template}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, "image/png");
  }

  return (
    <div className="graphic-maker">
      <div className="graphic-preview" style={{ aspectRatio: `${SIZES[size].w} / ${SIZES[size].h}` }}>
        <canvas ref={canvasRef} />
      </div>
      <div className="graphic-controls">
        <div className="seg" role="group" aria-label="Template">
          {TEMPLATES.map((t) => (
            <button key={t.key} type="button" className={template === t.key ? "on" : ""} onClick={() => setTemplate(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        <select value={size} onChange={(e) => setSize(e.target.value as SizeKey)} aria-label="Size">
          {(Object.keys(SIZES) as SizeKey[]).map((k) => (
            <option key={k} value={k}>{SIZES[k].label}</option>
          ))}
        </select>
        <label className="small">
          Headline
          <input value={headline} onChange={(e) => setHeadline(e.target.value)} />
        </label>
        <label className="small">
          Second line
          <input value={sub} onChange={(e) => setSub(e.target.value)} placeholder="Date, place or offer" />
        </label>
        <label className="file-btn btn btn-ghost">
          {photo ? "Change photo" : "Add your photo"}
          <input type="file" accept="image/*" onChange={(e) => addPhoto(e.target.files?.[0])} hidden />
        </label>
        {!props.logo && <p className="muted small">Tip: add your logo in Brand Kit and it shows up here.</p>}
        {error && <p className="error">{error}</p>}
        <button type="button" className="btn btn-primary" onClick={download}>Download PNG</button>
      </div>
    </div>
  );
}
