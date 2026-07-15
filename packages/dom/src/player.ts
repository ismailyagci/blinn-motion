/**
 * The DOM Player. Builds nested absolutely-positioned `<div>`s (children nest in
 * parents so transforms inherit like the DOM), then per frame samples each layer
 * with @blinn-motion/core's `computeLayer` and writes CSS transforms/styles. Masks,
 * SVG vector paths and procedural shaders are handled as DOM enhancements.
 */
import {
  computeLayer,
  parseColor,
  Ticker,
  type Layer,
  type LayerState,
  type MotionDoc,
} from "@blinn-motion/core";
import { colorCss, effectsToCss, fillWithStops, paintToCss, shapeClipCss } from "./css.js";
import { drawShader, type CausticEntry } from "./caustics.js";
import { buildPathSvg, type SvgEl } from "./svg.js";

export interface DomPlayerOptions {
  loop?: boolean;
  rate?: number;
  autoplay?: boolean;
  onframe?: (time: number, fraction: number) => void;
}

interface Entry {
  layer: Layer;
  el: SvgEl;
}
interface MaskEntry {
  wrapper: HTMLElement;
  mask: Layer;
  w: number;
  h: number;
}
interface Built {
  el: HTMLElement;
  entries: Entry[];
  maskEntries: MaskEntry[];
  caustics: CausticEntry[];
}

function buildLayerDom(layer: Layer): Built {
  const el = document.createElement("div") as SvgEl;
  el.setAttribute("data-id", layer.id || "");
  const b = layer.base || {};
  const st = el.style;
  st.position = "absolute";
  st.left = (b.x || 0) + "px";
  st.top = (b.y || 0) + "px";
  st.width = (b.width || 0) + "px";
  st.height = (b.height || 0) + "px";
  st.boxSizing = "border-box";
  const anchor = b.anchor || { x: 0.5, y: 0.5 };
  st.transformOrigin = anchor.x * 100 + "% " + anchor.y * 100 + "%";
  st.willChange = "transform, opacity";
  if (b.clip) st.overflow = "hidden";
  if (b.blendMode && b.blendMode !== "normal") st.mixBlendMode = b.blendMode;

  if (b.effects && b.effects.length) {
    const fx = effectsToCss(b.effects);
    if (fx.boxShadow) st.boxShadow = fx.boxShadow;
    if (fx.filter) st.filter = fx.filter;
    if (fx.backdrop) {
      st.backdropFilter = fx.backdrop;
      (st as any).webkitBackdropFilter = fx.backdrop;
    }
  }
  const isPath = b.shape && b.shape.kind === "path";
  const isClip = b.shape && (b.shape.kind === "polygon" || b.shape.kind === "star" || b.shape.kind === "arc");
  let causticHere: CausticEntry | null = null;

  if (layer.type === "text" && b.text) {
    const tx = b.text;
    st.display = "flex";
    st.alignItems = "center";
    st.justifyContent = tx.align === "center" ? "center" : tx.align === "right" ? "flex-end" : "flex-start";
    st.fontFamily = (tx.fontFamily || "Inter") + ", system-ui, sans-serif";
    st.fontSize = (tx.fontSize || 16) + "px";
    st.fontWeight = String(tx.fontWeight || 400);
    st.lineHeight = String(tx.lineHeight || 1.2);
    st.letterSpacing = (tx.letterSpacing || 0) + "px";
    st.color = colorCss(tx.color || "#000000FF");
    st.whiteSpace = "pre";
    el.textContent = tx.characters || "";
  } else if (isPath) {
    buildPathSvg(el, b);
  } else {
    const shaderKind = b.shader && (b.shader.kind === "caustics" || b.shader.kind === "noise") ? b.shader.kind : null;
    if (shaderKind) {
      const cv = document.createElement("canvas");
      const CRES = shaderKind === "noise" ? 180 : 360;
      cv.width = CRES;
      cv.height = CRES;
      cv.style.position = "absolute";
      cv.style.left = "0";
      cv.style.top = "0";
      cv.style.width = "100%";
      cv.style.height = "100%";
      cv.style.display = "block";
      el.appendChild(cv);
      causticHere = { canvas: cv, ctx: cv.getContext("2d")!, w: CRES, h: CRES, kind: shaderKind };
    } else if (b.image) {
      st.backgroundImage = "url(" + b.image + ")";
      st.backgroundSize = "100% 100%";
      st.backgroundRepeat = "no-repeat";
    } else {
      st.background = paintToCss(b.fill);
    }
    if (isClip) {
      const cp = shapeClipCss(b.shape, (b.shape as any).points);
      st.clipPath = cp;
      (st as any).webkitClipPath = cp;
    } else if (layer.type === "ellipse") {
      st.borderRadius = "50%";
    } else if (!b.image && !shaderKind) {
      const cr = b.cornerRadius || [0, 0, 0, 0];
      st.borderRadius = cr[0] + "px " + cr[1] + "px " + cr[2] + "px " + cr[3] + "px";
    }
  }
  if (b.stroke && !isPath && !isClip) {
    const col = colorCss(b.stroke.color || "#000000FF");
    if (b.borderWeights) {
      // per-side borders [top, right, bottom, left]
      const w = b.borderWeights;
      st.borderStyle = "solid";
      st.borderColor = col;
      st.borderTopWidth = w[0] + "px";
      st.borderRightWidth = w[1] + "px";
      st.borderBottomWidth = w[2] + "px";
      st.borderLeftWidth = w[3] + "px";
    } else {
      st.border = (b.stroke.weight || 1) + "px solid " + col;
    }
  }

  const entry: Entry = { layer, el };
  let entries: Entry[] = [entry];
  let maskEntries: MaskEntry[] = [];
  let caustics: CausticEntry[] = causticHere ? [causticHere] : [];
  const kids = layer.children || [];

  let maskIdx = -1;
  for (let mi = 0; mi < kids.length; mi++) {
    if (kids[mi]!.isMask) {
      maskIdx = mi;
      break;
    }
  }

  if (maskIdx >= 0 && kids[maskIdx]!.type === "text") {
    // TEXT-as-mask reveal: the text IS what shows; a sibling drives a clip reveal.
    const tBuilt = buildLayerDom(kids[maskIdx]!);
    el.appendChild(tBuilt.el);
    entries = entries.concat(tBuilt.entries);
    maskEntries = maskEntries.concat(tBuilt.maskEntries);
    caustics = caustics.concat(tBuilt.caustics);
    let driver: Layer | null = null;
    for (let di = 0; di < kids.length; di++) {
      if (di !== maskIdx) {
        driver = kids[di]!;
        break;
      }
    }
    if (driver) maskEntries.push({ wrapper: tBuilt.el, mask: driver, w: b.width || 0, h: b.height || 0 });
  } else if (maskIdx >= 0) {
    // SHAPE mask: clip the painted siblings to the mask's box; the mask isn't painted.
    const clip = document.createElement("div");
    clip.style.position = "absolute";
    clip.style.left = "0";
    clip.style.top = "0";
    clip.style.width = (b.width || 0) + "px";
    clip.style.height = (b.height || 0) + "px";
    el.appendChild(clip);
    for (let ci = 0; ci < kids.length; ci++) {
      if (ci === maskIdx) continue;
      const builtM = buildLayerDom(kids[ci]!);
      clip.appendChild(builtM.el);
      entries = entries.concat(builtM.entries);
      maskEntries = maskEntries.concat(builtM.maskEntries);
      caustics = caustics.concat(builtM.caustics);
    }
    maskEntries.push({ wrapper: clip, mask: kids[maskIdx]!, w: b.width || 0, h: b.height || 0 });
  } else {
    for (const kid of kids) {
      const built = buildLayerDom(kid);
      el.appendChild(built.el);
      entries = entries.concat(built.entries);
      maskEntries = maskEntries.concat(built.maskEntries);
      caustics = caustics.concat(built.caustics);
    }
  }
  return { el, entries, maskEntries, caustics };
}

/** Merge animated effect overrides into the base effects, then return CSS. */
function animatedEffectsCss(b: any, s: LayerState) {
  const merged = (b.effects || []).map((e: any, i: number) => {
    const o = s.effectOverrides[i];
    if (!o) return e;
    return {
      ...e,
      x: o.offsetX != null ? o.offsetX : e.x,
      y: o.offsetY != null ? o.offsetY : e.y,
      radius: o.radius != null ? o.radius : e.radius,
      spread: o.spread != null ? o.spread : e.spread,
      color: o.color != null ? o.color : e.color,
    };
  });
  return effectsToCss(merged);
}

function applyState(el: SvgEl, layer: Layer, s: LayerState): void {
  el.style.transform =
    "translate(" + s.translateX + "px," + s.translateY + "px) rotate(" + s.rotation + "deg) scale(" + s.scaleX + "," + s.scaleY + ")";
  el.style.opacity = String(s.opacity);
  const b = layer.base || {};
  if (b.width !== s.width) el.style.width = s.width + "px";
  if (b.height !== s.height) el.style.height = s.height + "px";
  const shape = b.shape;
  if (shape && (shape.kind === "polygon" || shape.kind === "star" || shape.kind === "arc")) {
    const cp = shapeClipCss(shape, s.shapeCount != null ? s.shapeCount : (shape as any).points);
    el.style.clipPath = cp;
    (el.style as any).webkitClipPath = cp;
  }
  if (shape && shape.kind === "path" && el._svgPaths) {
    const trimmed = s.trimStart > 0 || s.trimEnd < 1;
    for (let pi = 0; pi < el._svgPaths.length; pi++) {
      const path = el._svgPaths[pi]!;
      const pd = (shape.paths || [])[pi] || ({} as any);
      if (pd.stroke || (b.stroke && b.stroke.color)) path.setAttribute("stroke-width", String(s.strokeWeight));
      if (s.strokeColorOverride != null) path.setAttribute("stroke", colorCss(s.strokeColorOverride));
      if (s.fillColorOverride != null && pd.fill) path.setAttribute("fill", colorCss(s.fillColorOverride));
      // PATH_TRIM: reveal only [trimStart, trimEnd] of the stroke length
      if (trimmed) {
        try {
          const len = path.getTotalLength();
          const start = s.trimStart * len;
          const vis = Math.max(0, (s.trimEnd - s.trimStart) * len);
          path.style.strokeDasharray = vis + " " + len;
          path.style.strokeDashoffset = String(-start);
        } catch {
          /* getTotalLength unavailable (jsdom) */
        }
      }
    }
  }

  // animated effects (shadow offset/radius/spread/color)
  if (Object.keys(s.effectOverrides).length && b.effects && b.effects.length) {
    const fx = animatedEffectsCss(b, s);
    el.style.boxShadow = fx.boxShadow;
    if (fx.filter) el.style.filter = fx.filter;
  }

  // animated stroke color / weight on box borders
  if (b.stroke && !(shape && (shape.kind === "path" || shape.kind === "polygon" || shape.kind === "star" || shape.kind === "arc"))) {
    const col = s.strokeColorOverride != null ? colorCss(s.strokeColorOverride) : colorCss(b.stroke.color || "#000000FF");
    if (s.borderWeights) {
      el.style.borderStyle = "solid";
      el.style.borderColor = col;
      el.style.borderTopWidth = s.borderWeights[0] + "px";
      el.style.borderRightWidth = s.borderWeights[1] + "px";
      el.style.borderBottomWidth = s.borderWeights[2] + "px";
      el.style.borderLeftWidth = s.borderWeights[3] + "px";
    } else {
      el.style.border = s.strokeWeight + "px solid " + col;
    }
  }

  const isImg = b.image;
  // animated gradient stops → re-derive the gradient background
  const fillStopAnim = b.fill && (b.fill.type === "linear" || b.fill.type === "radial" || b.fill.type === "angular" || b.fill.type === "diamond") && Object.keys(s.fillStopOverrides).length;
  if (fillStopAnim && !isImg) {
    el.style.background = paintToCss(fillWithStops(b.fill, s.fillStopOverrides));
  }

  if (layer.type !== "text" && !isImg && shape == null) {
    if (s.fillColorOverride != null) el.style.background = colorCss(s.fillColorOverride);
    if (layer.type !== "ellipse") {
      const cr = s.cornerRadius;
      el.style.borderRadius = cr[0] + "px " + cr[1] + "px " + cr[2] + "px " + cr[3] + "px";
    }
  } else if (layer.type !== "text" && !isImg && shape && (shape.kind === "polygon" || shape.kind === "star" || shape.kind === "arc")) {
    if (s.fillColorOverride != null) el.style.background = colorCss(s.fillColorOverride);
  } else if (s.fillColorOverride != null && layer.type === "text") {
    el.style.color = colorCss(s.fillColorOverride);
  }
}

export class DomPlayer {
  readonly stage: HTMLElement;
  readonly duration: number;
  private ticker: Ticker;
  private entries: Entry[] = [];
  private maskEntries: MaskEntry[] = [];
  private caustics: CausticEntry[] = [];

  constructor(container: HTMLElement, doc: MotionDoc, opts: DomPlayerOptions = {}) {
    this.duration = doc.duration || 1;
    container.innerHTML = "";
    const stage = document.createElement("div");
    stage.setAttribute("data-blinn-stage", "dom");
    stage.style.position = "relative";
    stage.style.overflow = "hidden"; // clip layers that animate past stage bounds
    stage.style.flex = "none";
    const sz = doc.stage || { width: 300, height: 300 };
    stage.style.width = sz.width + "px";
    stage.style.height = sz.height + "px";
    stage.style.background = sz.background ? colorCss(sz.background) : "transparent";
    this.stage = stage;
    container.appendChild(stage);

    for (const layer of doc.layers || []) {
      const built = buildLayerDom(layer);
      stage.appendChild(built.el);
      this.entries = this.entries.concat(built.entries);
      this.maskEntries = this.maskEntries.concat(built.maskEntries);
      this.caustics = this.caustics.concat(built.caustics);
    }

    this.ticker = new Ticker({
      duration: this.duration,
      loop: opts.loop,
      rate: opts.rate,
      onframe: (t, f) => {
        this.paint(t);
        opts.onframe?.(t, f);
      },
    });

    this.paint(0);
    if (opts.autoplay) this.play();
  }

  /** Paint a specific time without firing onframe (used for the initial frame). */
  private paint(t: number): void {
    for (const e of this.entries) {
      try {
        applyState(e.el, e.layer, computeLayer(e.layer, t));
      } catch {
        /* one bad layer never breaks the rest */
      }
    }
    for (const me of this.maskEntries) {
      try {
        const ms = computeLayer(me.mask, t);
        const left = ms.x + ms.translateX;
        const top = ms.y + ms.translateY;
        const w = ms.width * ms.scaleX;
        const h = ms.height * ms.scaleY;
        const iTop = Math.max(0, top);
        const iLeft = Math.max(0, left);
        const iRight = Math.max(0, me.w - (left + w));
        const iBottom = Math.max(0, me.h - (top + h));
        me.wrapper.style.clipPath = "inset(" + iTop + "px " + iRight + "px " + iBottom + "px " + iLeft + "px)";
      } catch {
        /* ignore */
      }
    }
    for (const c of this.caustics) {
      try {
        drawShader(c, t);
      } catch {
        /* ignore */
      }
    }
  }

  get time(): number {
    return this.ticker.time;
  }
  get isPlaying(): boolean {
    return this.ticker.isPlaying;
  }
  get loop(): boolean {
    return this.ticker.loop;
  }
  set loop(v: boolean) {
    this.ticker.loop = v;
  }
  play(): this {
    this.ticker.play();
    return this;
  }
  pause(): this {
    this.ticker.pause();
    return this;
  }
  stop(): this {
    this.ticker.stop();
    return this;
  }
  toggle(): this {
    this.ticker.toggle();
    return this;
  }
  seek(t: number): this {
    this.ticker.seek(t);
    return this;
  }
  seekFraction(f: number): this {
    this.ticker.seekFraction(f);
    return this;
  }
  /** Drive from an external 0..1 signal (scroll, gesture, scrubber). */
  setProgress(progress: number): this {
    this.ticker.setProgress(progress);
    return this;
  }
  get progress(): number {
    return this.ticker.progress;
  }
  setRate(r: number): this {
    this.ticker.setRate(r);
    return this;
  }
}

/** Create and mount a DOM player. Mirrors the classic `MotionEngine.create`. */
export function create(container: HTMLElement, doc: MotionDoc, opts?: DomPlayerOptions): DomPlayer {
  return new DomPlayer(container, doc, opts);
}
