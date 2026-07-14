/* ============================================================
   blinn-motion-mini — a compact, self-contained demonstration of the
   Blinn Motion idea: a pure, DOM-free `sample(doc, t)` render method
   plus a thin DOM adapter that paints the resolved tree.

   This is NOT @blinn-motion/core — it's a ~250-line teaching copy that
   runs the real `card` MotionDoc live on the landing page, so the
   site literally demonstrates the engine it describes. Supports
   linear / hold / cubicBezier (Newton-Raphson) / spring easing,
   `set` + `offset` track ops, nested layers, gradient + solid
   fills, and rect / ellipse / text layers.
   ============================================================ */

export type Easing =
  | { type: "linear" }
  | { type: "hold" }
  | { type: "cubicBezier"; p: [number, number, number, number] }
  | { type: "spring"; bounce: number };

export interface Key {
  t: number;
  v: number | number[];
  easing: Easing;
}
export interface Track {
  property: string;
  op: "set" | "offset";
  keys: Key[];
}
export interface Fill {
  type: "solid" | "linear";
  color?: string;
  angle?: number;
  stops?: { pos: number; color: string }[];
}
export interface TextStyle {
  characters: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  letterSpacing?: number;
  align?: string;
}
export interface Base {
  x: number;
  y: number;
  width: number;
  height: number;
  opacity?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  anchor?: { x: number; y: number };
  cornerRadius?: [number, number, number, number];
  fill?: Fill;
  text?: TextStyle;
}
export interface Layer {
  id: string;
  name: string;
  type: "rect" | "ellipse" | "text";
  base: Base;
  tracks?: Track[];
  children?: Layer[];
}
export interface MotionDoc {
  duration: number;
  fps: number;
  stage: { width: number; height: number; background: string };
  layers: Layer[];
}

/* ---------- easing ---------- */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function cubicBezier(p: [number, number, number, number], x: number): number {
  const [x1, y1, x2, y2] = p;
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const fx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const dfx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  // Newton-Raphson, then bisection fallback for stability.
  let t = x;
  for (let i = 0; i < 8; i++) {
    const e = fx(t) - x;
    if (Math.abs(e) < 1e-6) break;
    const d = dfx(t);
    if (Math.abs(d) < 1e-6) break;
    t -= e / d;
  }
  if (t < 0 || t > 1) {
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 24; i++) {
      const e = fx(t) - x;
      if (Math.abs(e) < 1e-6) break;
      if (e > 0) hi = t;
      else lo = t;
      t = (lo + hi) / 2;
    }
  }
  return ((ay * t + by) * t + cy) * t;
}

// Damped-spring step response, normalized so spring(0)=0, spring(1)=1.
function spring(t: number, bounce: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const b = clamp(bounce, 0, 0.9);
  const zeta = Math.max(0.12, 1 - b); // damping ratio (more bounce → less damping)
  const omega = 9 + b * 14; // natural frequency
  if (zeta < 1) {
    const wd = omega * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * omega * t) * (Math.cos(wd * t) + ((zeta * omega) / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-omega * t) * (1 + omega * t);
}

function ease(e: Easing, t: number): number {
  switch (e.type) {
    case "hold":
      return 0;
    case "cubicBezier":
      return cubicBezier(e.p, t);
    case "spring":
      return spring(t, e.bounce);
    default:
      return t;
  }
}

/* ---------- value interpolation ---------- */

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function parseColor(c: string): [number, number, number, number] {
  const h = c.replace("#", "");
  const n = h.length >= 8 ? 8 : 6;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = n === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return [r, g, b, a];
}
function rgba(c: [number, number, number, number]): string {
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${c[3].toFixed(3)})`;
}
function lerpColor(a: string, b: string, t: number): string {
  const ca = parseColor(a);
  const cb = parseColor(b);
  return rgba([lerp(ca[0], cb[0], t), lerp(ca[1], cb[1], t), lerp(ca[2], cb[2], t), lerp(ca[3], cb[3], t)]);
}

function interp(a: number | number[], b: number | number[], t: number): number | number[] {
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => lerp(v, b[i], t));
  return lerp(a as number, b as number, t);
}

// Sample one track at time t. Color tracks carry string values, handled separately.
function sampleTrack(track: Track, t: number, isColor: boolean): number | number[] | string {
  const keys = track.keys;
  if (t <= keys[0].t) return keys[0].v as never;
  const last = keys[keys.length - 1];
  if (t >= last.t) return last.v as never;
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].t <= t) i++;
  const k0 = keys[i];
  const k1 = keys[i + 1];
  const local = (t - k0.t) / (k1.t - k0.t);
  const e = ease(k0.easing, local);
  if (isColor) return lerpColor(k0.v as unknown as string, k1.v as unknown as string, e);
  return interp(k0.v, k1.v, e);
}

/* ---------- resolved render node ---------- */

export interface RenderNode {
  id: string;
  type: Layer["type"];
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  tx: number;
  ty: number;
  anchor: { x: number; y: number };
  cornerRadius: [number, number, number, number];
  fill?: Fill;
  fillColor?: string;
  text?: TextStyle;
  children: RenderNode[];
}

const COLOR_PROPS = new Set(["fillColor"]);

function sampleLayer(layer: Layer, t: number): RenderNode {
  const b = layer.base;
  const node: RenderNode = {
    id: layer.id,
    type: layer.type,
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
    opacity: b.opacity ?? 1,
    rotation: b.rotation ?? 0,
    scaleX: b.scaleX ?? 1,
    scaleY: b.scaleY ?? 1,
    tx: 0,
    ty: 0,
    anchor: b.anchor ?? { x: 0.5, y: 0.5 },
    cornerRadius: b.cornerRadius ?? [0, 0, 0, 0],
    fill: b.fill,
    fillColor: b.fill?.color,
    text: b.text,
    children: [],
  };

  for (const track of layer.tracks ?? []) {
    const isColor = COLOR_PROPS.has(track.property);
    const val = sampleTrack(track, t, isColor);
    switch (track.property) {
      case "opacity":
        node.opacity = track.op === "offset" ? node.opacity + (val as number) : (val as number);
        break;
      case "translateX":
        node.tx += val as number;
        break;
      case "translateY":
        node.ty += val as number;
        break;
      case "rotation":
        node.rotation += val as number;
        break;
      case "scaleX":
        node.scaleX = val as number;
        break;
      case "scaleY":
        node.scaleY = val as number;
        break;
      case "scaleXY": {
        const a = val as number[];
        node.scaleX = a[0];
        node.scaleY = a[1];
        break;
      }
      case "fillColor":
        node.fillColor = val as string;
        break;
    }
  }

  node.children = (layer.children ?? []).map((c) => sampleLayer(c, t));
  return node;
}

/** THE render method: pure, DOM-free. Walk the doc, sample every track at `t`,
 *  return a fully-resolved tree where every number is final. */
export function sample(doc: MotionDoc, t: number): RenderNode[] {
  const clamped = clamp(t, 0, doc.duration);
  return doc.layers.map((l) => sampleLayer(l, clamped));
}

/* ---------- DOM adapter ---------- */

function fillToCss(node: RenderNode): string {
  if (node.fillColor && (!node.fill || node.fill.type === "solid")) return node.fillColor;
  const f = node.fill;
  if (!f) return "transparent";
  if (f.type === "linear" && f.stops) {
    const stops = f.stops.map((s) => `${s.color} ${Math.round(s.pos * 100)}%`).join(", ");
    return `linear-gradient(${f.angle ?? 180}deg, ${stops})`;
  }
  return node.fillColor ?? f.color ?? "transparent";
}

function buildEl(node: RenderNode): HTMLElement {
  const el = document.createElement("div");
  el.dataset.id = node.id;
  const s = el.style;
  s.position = "absolute";
  s.left = node.x + "px";
  s.top = node.y + "px";
  s.width = node.width + "px";
  s.height = node.height + "px";
  s.willChange = "transform, opacity";

  if (node.type === "text" && node.text) {
    const tx = node.text;
    s.display = "flex";
    s.alignItems = "center";
    s.color = tx.color;
    s.fontSize = tx.fontSize + "px";
    s.fontWeight = String(tx.fontWeight);
    s.letterSpacing = (tx.letterSpacing ?? 0) + "px";
    s.fontFamily = "Inter, system-ui, sans-serif";
    s.whiteSpace = "nowrap";
    s.justifyContent = tx.align === "center" ? "center" : tx.align === "right" ? "flex-end" : "flex-start";
    el.textContent = tx.characters;
  } else {
    s.borderRadius =
      node.type === "ellipse"
        ? "50%"
        : node.cornerRadius.map((r) => r + "px").join(" ");
  }

  for (const child of node.children) el.appendChild(buildEl(child));
  return el;
}

function updateEl(el: HTMLElement, node: RenderNode): void {
  const s = el.style;
  s.opacity = String(node.opacity);
  s.transformOrigin = `${node.anchor.x * node.width}px ${node.anchor.y * node.height}px`;
  s.transform = `translate(${node.tx}px, ${node.ty}px) rotate(${node.rotation}deg) scale(${node.scaleX}, ${node.scaleY})`;
  if (node.type !== "text") s.background = fillToCss(node);

  const kids = el.children;
  for (let i = 0; i < node.children.length; i++) {
    updateEl(kids[i] as HTMLElement, node.children[i]);
  }
}

export interface Player {
  play(): void;
  pause(): void;
  toggle(): void;
  seekFraction(f: number): void;
  setSpeed(s: number): void;
  readonly playing: boolean;
  readonly duration: number;
  onFrame(cb: (t: number, fraction: number, playing: boolean) => void): void;
  destroy(): void;
}

/** Mount a MotionDoc into `container`, scaled to fit, and return a player. */
export function mount(container: HTMLElement, doc: MotionDoc): Player {
  const stage = document.createElement("div");
  stage.style.position = "absolute";
  stage.style.inset = "0";
  stage.style.width = doc.stage.width + "px";
  stage.style.height = doc.stage.height + "px";
  stage.style.transformOrigin = "top left";

  const fit = () => {
    const r = container.getBoundingClientRect();
    const scale = Math.min(r.width / doc.stage.width, r.height / doc.stage.height);
    const offX = (r.width - doc.stage.width * scale) / 2;
    const offY = (r.height - doc.stage.height * scale) / 2;
    stage.style.transform = `translate(${offX}px, ${offY}px) scale(${scale})`;
  };

  const roots = sample(doc, 0);
  const els = roots.map((n) => {
    const el = buildEl(n);
    stage.appendChild(el);
    return el;
  });
  container.appendChild(stage);
  fit();
  const ro = new ResizeObserver(fit);
  ro.observe(container);

  let t = 0;
  let playing = false;
  let speed = 1;
  let raf = 0;
  let last = 0;
  let frameCb: ((t: number, f: number, p: boolean) => void) | null = null;

  const render = () => {
    const r = sample(doc, t);
    for (let i = 0; i < r.length; i++) updateEl(els[i], r[i]);
    frameCb?.(t, t / doc.duration, playing);
  };

  const tick = (now: number) => {
    if (!playing) return;
    const dt = last ? (now - last) / 1000 : 0;
    last = now;
    t += dt * speed;
    if (t >= doc.duration) t = t % doc.duration; // loop
    render();
    raf = requestAnimationFrame(tick);
  };

  render();

  return {
    get playing() {
      return playing;
    },
    get duration() {
      return doc.duration;
    },
    play() {
      if (playing) return;
      playing = true;
      last = 0;
      raf = requestAnimationFrame(tick);
    },
    pause() {
      playing = false;
      cancelAnimationFrame(raf);
      render();
    },
    toggle() {
      playing ? this.pause() : this.play();
    },
    seekFraction(f: number) {
      t = clamp(f, 0, 1) * doc.duration;
      render();
    },
    setSpeed(s: number) {
      speed = s;
    },
    onFrame(cb) {
      frameCb = cb;
    },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      stage.remove();
    },
  };
}
