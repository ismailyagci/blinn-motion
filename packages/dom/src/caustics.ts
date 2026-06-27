/**
 * Procedural animated water caustics (Figma "Water caustic" effect). A cheap
 * sum-of-sines interference field sharpened into thin bright veins over a blue
 * base, drawn into a canvas that fills the layer box and is clipped to the
 * (morphing/scaling) shape — so the water flows AND fills, vs a frozen PNG.
 */
export interface CausticEntry {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  img?: ImageData;
  /** Which procedural shader to draw. */
  kind?: "caustics" | "noise";
}

/** Pseudo-random in [0,1) from integer coords + time (no Math.random — deterministic). */
function hash(x: number, y: number, t: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233 + t * 0.5) * 43758.5453;
  return s - Math.floor(s);
}

/** Procedural monochrome noise/grain overlay (Figma NOISE / TEXTURE effect). */
export function drawNoise(ent: CausticEntry, t: number): void {
  const ctx = ent.ctx;
  const W = ent.w;
  const H = ent.h;
  const img = ent.img || (ent.img = ctx.createImageData(W, H));
  const d = img.data;
  let i = 0;
  const drift = Math.floor(t * 8); // animate the grain over time
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = hash(x, y, drift);
      const v = n * 255;
      d[i++] = v;
      d[i++] = v;
      d[i++] = v;
      d[i++] = Math.round(80 + n * 80); // semi-transparent grain
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** Dispatch to the right shader by entry kind. */
export function drawShader(ent: CausticEntry, t: number): void {
  if (ent.kind === "noise") drawNoise(ent, t);
  else drawCaustics(ent, t);
}

export function drawCaustics(ent: CausticEntry, t: number): void {
  const ctx = ent.ctx;
  const W = ent.w;
  const H = ent.h;
  const img = ent.img || (ent.img = ctx.createImageData(W, H));
  const d = img.data;
  let i = 0;
  for (let y = 0; y < H; y++) {
    const fy = y / H;
    for (let x = 0; x < W; x++) {
      const fx = x / W;
      const v =
        Math.sin(fx * 18.0 + t * 0.9) +
        Math.sin(fy * 20.0 - t * 1.05) +
        Math.sin(fx * 13.0 + fy * 15.0 + t * 0.7) +
        Math.sin(fx * 15.0 - fy * 12.0 - t * 0.85) +
        0.6 * Math.sin(((fx - 0.5) * (fx - 0.5) + (fy - 0.5) * (fy - 0.5)) * 90.0 - t * 1.3);
      let c = Math.abs(Math.sin(v * 1.1));
      c = c * c;
      c = c * c;
      c = c * c; // ~pow 8 → thin lines
      const base = 0.55 + 0.15 * Math.sin(fx * 3.0 + fy * 2.0 + t * 0.3);
      const r = 96 + base * 60 + c * 150;
      const g = 156 + base * 60 + c * 99;
      const b = 216 + base * 36 + c * 39;
      d[i++] = r > 255 ? 255 : r;
      d[i++] = g > 255 ? 255 : g;
      d[i++] = b > 255 ? 255 : b;
      d[i++] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}
