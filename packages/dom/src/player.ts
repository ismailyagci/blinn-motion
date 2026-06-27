/**
 * The DOM Player. Builds nested absolutely-positioned `<div>`s (children nest in
 * parents so transforms inherit, like Lottie), then per frame samples each layer
 * with @fottie/core's `computeLayer` and writes CSS transforms/styles. Masks,
 * SVG vector paths and procedural shaders are handled as DOM enhancements.
 */
import {
  computeLayer,
  parseColor,
  Ticker,
  type Layer,
  type LayerState,
  type MotionDoc,
} from "@fottie/core";
import { colorCss, effectsToCss, paintToCss, shapeClipCss } from "./css.js";
import { drawCaustics, type CausticEntry } from "./caustics.js";
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
  const isClip = b.shape && (b.shape.kind === "polygon" || b.shape.kind === "star");
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
    const isCaustic = b.shader && b.shader.kind === "caustics";
    if (isCaustic) {
      const cv = document.createElement("canvas");
      const CRES = 360;
      cv.width = CRES;
      cv.height = CRES;
      cv.style.position = "absolute";
      cv.style.left = "0";
      cv.style.top = "0";
      cv.style.width = "100%";
      cv.style.height = "100%";
      cv.style.display = "block";
      el.appendChild(cv);
      causticHere = { canvas: cv, ctx: cv.getContext("2d")!, w: CRES, h: CRES };
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
    } else if (!b.image && !isCaustic) {
      const cr = b.cornerRadius || [0, 0, 0, 0];
      st.borderRadius = cr[0] + "px " + cr[1] + "px " + cr[2] + "px " + cr[3] + "px";
    }
  }
  if (b.stroke && !isPath && !isClip) {
    st.border = (b.stroke.weight || 1) + "px solid " + colorCss(b.stroke.color || "#000000FF");
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

function applyState(el: SvgEl, layer: Layer, s: LayerState): void {
  el.style.transform =
    "translate(" + s.translateX + "px," + s.translateY + "px) rotate(" + s.rotation + "deg) scale(" + s.scaleX + "," + s.scaleY + ")";
  el.style.opacity = String(s.opacity);
  const b = layer.base || {};
  if (b.width !== s.width) el.style.width = s.width + "px";
  if (b.height !== s.height) el.style.height = s.height + "px";
  const shape = b.shape;
  if (shape && (shape.kind === "polygon" || shape.kind === "star")) {
    const cp = shapeClipCss(shape, s.shapeCount != null ? s.shapeCount : (shape as any).points);
    el.style.clipPath = cp;
    (el.style as any).webkitClipPath = cp;
  }
  if (shape && shape.kind === "path" && el._svgPaths) {
    for (let pi = 0; pi < el._svgPaths.length; pi++) {
      const pd = (shape.paths || [])[pi] || ({} as any);
      if (pd.stroke || (b.stroke && b.stroke.color)) el._svgPaths[pi]!.setAttribute("stroke-width", String(s.strokeWeight));
      if (s.fillColorOverride != null && pd.fill) el._svgPaths[pi]!.setAttribute("fill", colorCss(s.fillColorOverride));
    }
  }
  const isImg = b.image;
  if (layer.type !== "text" && !isImg && shape == null) {
    if (s.fillColorOverride != null) el.style.background = colorCss(s.fillColorOverride);
    if (layer.type !== "ellipse") {
      const cr = s.cornerRadius;
      el.style.borderRadius = cr[0] + "px " + cr[1] + "px " + cr[2] + "px " + cr[3] + "px";
    }
  } else if (layer.type !== "text" && !isImg && shape && (shape.kind === "polygon" || shape.kind === "star")) {
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
    stage.style.position = "relative";
    stage.style.overflow = "hidden";
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
        drawCaustics(c, t);
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
  setRate(r: number): this {
    this.ticker.setRate(r);
    return this;
  }
}

/** Create and mount a DOM player. Mirrors the classic `MotionEngine.create`. */
export function create(container: HTMLElement, doc: MotionDoc, opts?: DomPlayerOptions): DomPlayer {
  return new DomPlayer(container, doc, opts);
}
