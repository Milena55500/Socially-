// Browser-only helpers for logos, brand colors and drawing post graphics on a <canvas>.

export const DEFAULT_COLORS = ["#ff5a5f", "#7b5cff"];

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't open that image."));
    img.src = src;
  });
}

export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsDataURL(file);
  });
}

// Shrinks an uploaded image so it's small enough to save (keeps transparency for logos).
export async function resizeImage(file: File, maxSide: number, type: "image/png" | "image/jpeg" = "image/png"): Promise<string> {
  const img = await loadImage(await readFile(file));
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  let url = canvas.toDataURL(type, 0.9);
  if (url.length > 650_000) url = canvas.toDataURL("image/webp", 0.85);
  if (url.length > 650_000) url = canvas.toDataURL("image/jpeg", 0.75);
  return url;
}

const toHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Black or white, whichever reads better on this background.
export function textOn(hex: string): string {
  return luminance(hex) > 0.45 ? "#15131f" : "#ffffff";
}

// Picks the 2 most common "real" colors in a logo (skips white, black, greys, transparent).
export async function extractColors(dataUrl: string): Promise<string[]> {
  const img = await loadImage(dataUrl);
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 128) continue;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    if (max > 235 && sat < 0.12) continue; // white-ish
    if (max < 30) continue; // black-ish
    if (sat < 0.15) continue; // grey
    const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
    const bucket = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    bucket.n++;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
  }
  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n);
  const colors: string[] = [];
  for (const c of sorted) {
    const hex = toHex(c.r / c.n, c.g / c.n, c.b / c.n);
    // Skip colors too close to one we already picked.
    const [r, g, b] = hexToRgb(hex);
    const close = colors.some((h) => {
      const [r2, g2, b2] = hexToRgb(h);
      return Math.abs(r - r2) + Math.abs(g - g2) + Math.abs(b - b2) < 90;
    });
    if (!close) colors.push(hex);
    if (colors.length === 2) break;
  }
  // If the logo is black & white, keep its darkest color as the main brand color.
  if (colors.length === 0) {
    const dark = [...Array(data.length / 4).keys()].some((i) => data[i * 4 + 3] > 128 && data[i * 4] < 60);
    if (dark) colors.push("#1d1a2b");
  }
  while (colors.length < 2) colors.push(DEFAULT_COLORS[colors.length]);
  return colors;
}

// ---------- Drawing ----------

export type Template = "bold" | "photo" | "clean";
export type SizeKey = "square" | "portrait" | "story";
export const SIZES: Record<SizeKey, { w: number; h: number; label: string }> = {
  square: { w: 1080, h: 1080, label: "Square post (1080×1080)" },
  portrait: { w: 1080, h: 1350, label: "Portrait post (1080×1350)" },
  story: { w: 1080, h: 1920, label: "Story / Reel cover (1080×1920)" },
};

export type GraphicSpec = {
  template: Template;
  size: SizeKey;
  headline: string;
  sub: string;
  footer: string;
  colors: string[];
  logo: HTMLImageElement | null;
  photo: HTMLImageElement | null;
  font: string;
};

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Writes text as big as it can go while fitting the box. Returns the height used.
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  opts: { x: number; y: number; maxWidth: number; maxHeight: number; maxSize: number; minSize: number; weight: number; font: string; color: string; align?: CanvasTextAlign; lineHeight?: number }
): number {
  if (!text.trim()) return 0;
  const lh = opts.lineHeight ?? 1.08;
  let size = opts.maxSize;
  let lines: string[] = [];
  for (; size >= opts.minSize; size -= 4) {
    ctx.font = `${opts.weight} ${size}px ${opts.font}`;
    lines = wrap(ctx, text, opts.maxWidth);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (lines.length * size * lh <= opts.maxHeight && widest <= opts.maxWidth) break;
  }
  ctx.fillStyle = opts.color;
  ctx.textAlign = opts.align || "left";
  ctx.textBaseline = "top";
  lines.forEach((l, i) => ctx.fillText(l, opts.x, opts.y + i * size * lh));
  return lines.length * size * lh;
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function drawLogo(ctx: CanvasRenderingContext2D, logo: HTMLImageElement, x: number, y: number, box: number, badge: string | null) {
  const pad = badge ? box * 0.14 : 0;
  if (badge) {
    ctx.fillStyle = badge;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, box, box, box * 0.22);
    else ctx.rect(x, y, box, box);
    ctx.fill();
  }
  const inner = box - pad * 2;
  const scale = Math.min(inner / logo.width, inner / logo.height);
  const dw = logo.width * scale;
  const dh = logo.height * scale;
  ctx.drawImage(logo, x + pad + (inner - dw) / 2, y + pad + (inner - dh) / 2, dw, dh);
}

export function drawGraphic(canvas: HTMLCanvasElement, s: GraphicSpec) {
  const { w, h } = SIZES[s.size];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const [primary, secondary] = [s.colors[0] || DEFAULT_COLORS[0], s.colors[1] || s.colors[0] || DEFAULT_COLORS[1]];
  const m = 84; // margin
  const tall = h / w;

  if (s.template === "bold") {
    ctx.fillStyle = primary;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = secondary;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(w * 0.92, h * 0.12, w * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(w * 0.05, h * 0.98, w * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    const ink = textOn(primary);
    if (s.logo) drawLogo(ctx, s.logo, m, m, 170, "#ffffff");
    const top = h * (tall > 1.5 ? 0.38 : 0.3);
    const used = fitText(ctx, s.headline, { x: m, y: top, maxWidth: w - m * 2, maxHeight: h * 0.42, maxSize: 150, minSize: 56, weight: 800, font: s.font, color: ink });
    fitText(ctx, s.sub, { x: m, y: top + used + 36, maxWidth: w - m * 2, maxHeight: 160, maxSize: 52, minSize: 30, weight: 600, font: s.font, color: ink, lineHeight: 1.25 });
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.85;
    ctx.font = `700 36px ${s.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(s.footer, m, h - m);
    ctx.globalAlpha = 1;
  }

  if (s.template === "photo") {
    if (s.photo) {
      drawCover(ctx, s.photo, w, h);
    } else {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, primary);
      g.addColorStop(1, secondary);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    const shade = ctx.createLinearGradient(0, h * 0.35, 0, h);
    shade.addColorStop(0, "rgba(0,0,0,0)");
    shade.addColorStop(1, "rgba(0,0,0,0.78)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, w, h);
    if (s.logo) drawLogo(ctx, s.logo, w - m - 150, m, 150, "#ffffff");
    // Measure first so the text block sits at the bottom.
    const boxH = h * 0.3;
    const top = h - m - boxH - 120;
    ctx.fillStyle = primary;
    ctx.fillRect(m, top - 40, 120, 14);
    const used = fitText(ctx, s.headline, { x: m, y: top, maxWidth: w - m * 2, maxHeight: boxH, maxSize: 120, minSize: 52, weight: 800, font: s.font, color: "#ffffff" });
    fitText(ctx, s.sub, { x: m, y: top + used + 28, maxWidth: w - m * 2, maxHeight: 130, maxSize: 46, minSize: 28, weight: 600, font: s.font, color: "#ffffff", lineHeight: 1.25 });
  }

  if (s.template === "clean") {
    ctx.fillStyle = "#fbf8f3";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = primary;
    ctx.fillRect(0, 0, 28, h);
    // Dot pattern in the corner
    ctx.fillStyle = secondary;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
      ctx.beginPath();
      ctx.arc(w - m - c * 34, m + 10 + r * 34, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    if (s.logo) drawLogo(ctx, s.logo, m + 20, m, 180, null);
    const top = h * (tall > 1.5 ? 0.36 : 0.32);
    const used = fitText(ctx, s.headline, { x: m + 20, y: top, maxWidth: w - m * 2 - 20, maxHeight: h * 0.4, maxSize: 130, minSize: 52, weight: 800, font: s.font, color: "#15131f" });
    fitText(ctx, s.sub, { x: m + 20, y: top + used + 34, maxWidth: w - m * 2 - 20, maxHeight: 150, maxSize: 50, minSize: 28, weight: 700, font: s.font, color: luminance(primary) > 0.6 ? "#15131f" : primary, lineHeight: 1.25 });
    ctx.fillStyle = "#6b6578";
    ctx.font = `600 34px ${s.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(s.footer, m + 20, h - m);
  }
}
