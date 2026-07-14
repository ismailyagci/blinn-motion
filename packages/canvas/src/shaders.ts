/**
 * Procedural shader fills (Figma SHADER/NOISE/"Water caustic") for the canvas
 * backend. Mirrors @blinn-motion/dom's caustics/noise so a `node.shader` overlay looks
 * the same on both adapters. Rendered into a small cached offscreen image, then
 * drawn (clipped) over the node box.
 */

let buf: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; img: ImageData; res: number } | null = null;

function offscreen(res: number) {
  if (buf && buf.res === res) return buf;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = res;
  canvas.height = res;
  const ctx = canvas.getContext("2d");
  if (!ctx || typeof ctx.createImageData !== "function") return null;
  const img = ctx.createImageData(res, res);
  if (!img || !img.data) return null; // stubbed/headless ctx — skip the shader
  buf = { canvas, ctx, img, res };
  return buf;
}

/** Deterministic pseudo-random in [0,1) from coords + time. */
function hash(x: number, y: number, t: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233 + t * 0.5) * 43758.5453;
  return s - Math.floor(s);
}

function fillNoise(img: ImageData, res: number, t: number): void {
  const d = img.data;
  let i = 0;
  const drift = Math.floor(t * 8);
  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      const n = hash(x, y, drift);
      const v = n * 255;
      d[i++] = v;
      d[i++] = v;
      d[i++] = v;
      d[i++] = Math.round(80 + n * 80);
    }
  }
}

function fillCaustics(img: ImageData, res: number, t: number): void {
  const d = img.data;
  let i = 0;
  for (let y = 0; y < res; y++) {
    const fy = y / res;
    for (let x = 0; x < res; x++) {
      const fx = x / res;
      const v =
        Math.sin(fx * 18.0 + t * 0.9) +
        Math.sin(fy * 20.0 - t * 1.05) +
        Math.sin(fx * 13.0 + fy * 15.0 + t * 0.7) +
        Math.sin(fx * 15.0 - fy * 12.0 - t * 0.85) +
        0.6 * Math.sin(((fx - 0.5) * (fx - 0.5) + (fy - 0.5) * (fy - 0.5)) * 90.0 - t * 1.3);
      let c = Math.abs(Math.sin(v * 1.1));
      c = c * c;
      c = c * c;
      c = c * c;
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
}

/**
 * Draw a procedural shader fill over [0,0,w,h] in the current (already
 * transformed) context. Caller is responsible for clipping to the node shape.
 */
export function paintShader(ctx: CanvasRenderingContext2D, kind: string, w: number, h: number, time: number): void {
  if (kind !== "noise" && kind !== "caustics") return;
  const res = kind === "noise" ? 96 : 180;
  const o = offscreen(res);
  if (!o) return;
  if (kind === "noise") fillNoise(o.img, res, time);
  else fillCaustics(o.img, res, time);
  o.ctx.putImageData(o.img, 0, 0);
  ctx.drawImage(o.canvas, 0, 0, w, h);
}
