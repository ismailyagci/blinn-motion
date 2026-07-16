/**
 * Canvas painter for a @blinn-motion/core {@link RenderTree}. Walks the resolved node
 * tree, replicating the DOM transform model on a 2D context:
 *   position at (x,y) → CSS translate → rotate/scale around the anchor → draw box
 * Children inherit the parent transform and opacity, exactly like nested DOM.
 */
import {
  parseColor,
  rgbaToCss,
  type Corners,
  type RenderNode,
  type RenderTree,
  type ResolvedPaint,
  type RGBA,
  type Vec2,
} from "@blinn-motion/core";
import { paintShader } from "./shaders.js";
import { trimmedPath2D } from "./path-trim.js";

/** Image cache so fills don't reload every frame. */
const imageCache = new Map<string, HTMLImageElement>();

function getImage(src: string): HTMLImageElement | null {
  let img = imageCache.get(src);
  if (!img) {
    img = new Image();
    img.src = src;
    imageCache.set(src, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

function css(c: RGBA): string {
  return rgbaToCss(c);
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Build the node's own outline path (in local box coords) into `ctx`. */
function boxPath(ctx: CanvasRenderingContext2D, node: RenderNode): void {
  ctx.beginPath();
  appendBoxPath(ctx, node);
}

/** Append the node's outline subpath WITHOUT a `beginPath` (for compound paths). */
function appendBoxPath(ctx: CanvasRenderingContext2D, node: RenderNode): void {
  const w = node.width;
  const h = node.height;
  const clip = node.clipShape;
  if (clip.kind === "ellipse") {
    ctx.ellipse(w / 2, h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
    return;
  }
  if (clip.kind === "polygon") {
    // Arc shapes arrive here too: @blinn-motion/core converts arc → polygon vertices,
    // so the generic polygon path covers pie/donut/arc with no special-casing.
    polyPath(ctx, clip.vertices, w, h);
    return;
  }
  // rounded rect
  const [tl, tr, br, bl] = clip.cornerRadius;
  const maxR = Math.min(Math.abs(w), Math.abs(h)) / 2;
  const r = (v: number) => Math.max(0, Math.min(v, maxR));
  roundRect(ctx, 0, 0, w, h, [r(tl), r(tr), r(br), r(bl)]);
}

function polyPath(ctx: CanvasRenderingContext2D, verts: Vec2[], w: number, h: number): void {
  verts.forEach((p, i) => {
    const x = p[0] * w;
    const y = p[1] * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: [number, number, number, number]): void {
  const [tl, tr, br, bl] = r;
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.arcTo(x + w, y, x + w, y + tr, tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
  ctx.lineTo(x + bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - bl, bl);
  ctx.lineTo(x, y + tl);
  ctx.arcTo(x, y, x + tl, y, tl);
  ctx.closePath();
}

/** CSS-like linear gradient across the box for the given angle (deg). */
function makeGradient(
  ctx: CanvasRenderingContext2D,
  angle: number,
  w: number,
  h: number,
  stops: Array<{ pos: number; color: RGBA }>,
): CanvasGradient {
  // CSS: 0deg points up, 90deg points right. Convert to a vector and project the
  // box so the gradient line spans corner-to-corner like CSS does.
  const rad = ((angle - 90) * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const cx = w / 2;
  const cy = h / 2;
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
  const g = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
  for (const s of stops) g.addColorStop(clamp01(s.pos), css(s.color));
  return g;
}

/**
 * Resolve a paint to a canvas `fillStyle` for solid + every gradient kind.
 * Returns `null` for image paints (the caller clips + draws the bitmap itself).
 */
function paintToFillStyle(
  ctx: CanvasRenderingContext2D,
  fill: ResolvedPaint,
  w: number,
  h: number,
): string | CanvasGradient | null {
  if (fill.type === "solid") return css(fill.color);
  if (fill.type === "image") return null;
  if (fill.type === "linear") return makeGradient(ctx, fill.angle, w, h, fill.stops);

  // radial / angular / diamond all originate from a center + radius.
  const cx = fill.center.x * w;
  const cy = fill.center.y * h;

  if (fill.type === "angular") {
    // Conic gradient (modern canvas only). Fall back to the radial gradient if
    // the API is missing or throws.
    //
    // Angle convention (MotionDoc / CSS): `0deg` is UP (12 o'clock), clockwise.
    // Canvas `createConicGradient(θ)`: `0` is RIGHT (+x / 3 o'clock), clockwise.
    // So CSS angle A maps to canvas as (A - 90)°.
    const anyCtx = ctx as unknown as {
      createConicGradient?: (startAngle: number, x: number, y: number) => CanvasGradient;
    };
    if (typeof anyCtx.createConicGradient === "function") {
      try {
        const start = ((fill.angle - 90) * Math.PI) / 180;
        const g = anyCtx.createConicGradient(start, cx, cy);
        for (const s of fill.stops) g.addColorStop(clamp01(s.pos), css(s.color));
        return g;
      } catch {
        // fall through to the radial approximation
      }
    }
  }

  // radial (and diamond) → match CSS `radial-gradient(ellipse R% R% at …)`:
  // percentage radii resolve against each box axis, so the ramp is elliptical
  // on non-square boxes. Bake that into the gradient via a temporary transform
  // (createRadialGradient samples the CTM at creation time).
  // TODO diamond: true Chebyshev-distance ramp; approximate as ellipse for now.
  const rx = Math.max(1e-6, Math.max(0, fill.radius) * Math.abs(w));
  const ry = Math.max(1e-6, Math.max(0, fill.radius) * Math.abs(h));
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  for (const s of fill.stops) g.addColorStop(clamp01(s.pos), css(s.color));
  ctx.restore();
  return g;
}

function paintFill(ctx: CanvasRenderingContext2D, node: RenderNode): void {
  const fill = node.fill;
  if (!fill) return;
  boxPath(ctx, node);
  if (fill.type === "image") {
    const img = getImage(fill.src);
    if (img) {
      ctx.save();
      ctx.clip();
      drawCover(ctx, img, node.width, node.height);
      ctx.restore();
    }
    return;
  }
  const style = paintToFillStyle(ctx, fill, node.width, node.height);
  if (style != null) {
    ctx.fillStyle = style;
    ctx.fill();
  }
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number): void {
  const ir = img.naturalWidth / img.naturalHeight;
  const br = w / h;
  let dw = w;
  let dh = h;
  let dx = 0;
  let dy = 0;
  if (ir > br) {
    dh = h;
    dw = h * ir;
    dx = (w - dw) / 2;
  } else {
    dw = w;
    dh = w / ir;
    dy = (h - dh) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
}

function paintText(ctx: CanvasRenderingContext2D, node: RenderNode): void {
  const t = node.text;
  if (!t) return;
  ctx.fillStyle = css(t.color);
  const weight = t.fontWeight || 400;
  ctx.font = `${weight} ${t.fontSize || 16}px ${t.fontFamily || "Inter"}, system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = t.align === "center" ? "center" : t.align === "right" ? "right" : "left";
  const x = t.align === "center" ? node.width / 2 : t.align === "right" ? node.width : 0;
  ctx.fillText(t.characters || "", x, node.height / 2);
}

// Optional SVG measurer (more accurate for complex arcs); pure-JS flatten is the default.
let svgMeasure: SVGPathElement | null = null;
function measurer(): SVGPathElement | null {
  if (svgMeasure) return svgMeasure;
  if (typeof document === "undefined") return null;
  try {
    svgMeasure = document.createElementNS("http://www.w3.org/2000/svg", "path");
  } catch {
    return null;
  }
  return svgMeasure;
}

/**
 * PATH_TRIM stroke geometry for [a, b] of path `d`.
 * Prefer pure-JS flatten (works in Node / no DOM); fall back to SVG getPointAtLength.
 */
function trimmedStrokePath(d: string, a: number, b: number): Path2D | null {
  const pure = trimmedPath2D(d, a, b);
  if (pure) return pure;

  const m = measurer();
  if (!m || typeof (m as any).getTotalLength !== "function") return null;
  try {
    m.setAttribute("d", d);
    const len = m.getTotalLength();
    if (!(len > 0)) return null;
    const start = clamp01(a) * len;
    const end = clamp01(b) * len;
    if (end <= start) return new Path2D();
    const steps = Math.max(2, Math.ceil((end - start) / 2));
    const p = new Path2D();
    for (let i = 0; i <= steps; i++) {
      const pt = m.getPointAtLength(start + ((end - start) * i) / steps);
      if (i === 0) p.moveTo(pt.x, pt.y);
      else p.lineTo(pt.x, pt.y);
    }
    return p;
  } catch {
    return null;
  }
}

function paintVectorPath(ctx: CanvasRenderingContext2D, node: RenderNode): void {
  const shape = node.shape;
  if (!shape || shape.kind !== "path") return;
  // PATH_TRIM: reveal only [trimStart, trimEnd] of the stroke length.
  const trimmed = node.trimStart > 0 || node.trimEnd < 1;
  for (const pd of shape.paths || []) {
    let p: Path2D;
    try {
      p = new Path2D(pd.d || "");
    } catch {
      continue;
    }
    if (pd.fill) {
      ctx.fillStyle = pd.fill;
      ctx.fill(p);
    }
    const strokeColor = pd.stroke || (node.stroke ? css(node.stroke.color) : null);
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = pd.strokeWidth != null ? pd.strokeWidth : node.stroke ? node.stroke.weight : 1;
      ctx.lineCap = (pd.cap as CanvasLineCap) || "butt";
      ctx.lineJoin = "round";
      // trim the stroked outline (fall back to the full path if trim fails)
      const strokePath = trimmed ? trimmedStrokePath(pd.d || "", node.trimStart, node.trimEnd) : null;
      ctx.stroke(strokePath || p);
    }
  }
}

// --------------------------------------------------------------------- borders ---

/**
 * Stroke the node's border. Uniform (single `boxPath` stroke) unless the node
 * carries per-side weights that differ AND its clip shape is a plain rect — in
 * which case each edge is stroked separately with its own line width.
 */
/**
 * Paint borders to match CSS `box-sizing: border-box`:
 * declared width/height is the OUTER edge; border strips sit fully inside.
 * Per-side weights use filled edge strips (more reliable than stroked lines,
 * and matches how browsers paint CSS borders).
 */
function strokeBorder(ctx: CanvasRenderingContext2D, node: RenderNode): void {
  const stroke = node.stroke;
  if (!stroke) return;
  const sides = stroke.sides;
  // Any explicit per-side weights → filled edge strips (CSS border-box).
  // Equal weights still go through strips so rounded clips stay consistent.
  if (sides) {
    paintBorderStrips(ctx, node, sides, stroke.color);
    return;
  }
  if (stroke.weight > 0) {
    // Uniform border: outer path minus inset path (even-odd) → true border ring,
    // including rounded corners — same silhouette as CSS border-radius + border.
    const w = stroke.weight;
    ctx.save();
    ctx.beginPath();
    appendBoxPath(ctx, node);
    appendUniformInsetPath(ctx, node, w);
    ctx.fillStyle = css(stroke.color);
    ctx.fill("evenodd");
    ctx.restore();
  }
}

/** Even-odd hole path inset by a uniform border weight. */
function appendUniformInsetPath(ctx: CanvasRenderingContext2D, node: RenderNode, inset: number): void {
  const w = node.width;
  const h = node.height;
  const maxInset = Math.max(0, Math.min(Math.abs(w), Math.abs(h)) / 2 - 1e-6);
  const i = Math.max(0, Math.min(inset, maxInset));
  if (i <= 0) return;
  const clip = node.clipShape;
  if (clip.kind === "ellipse") {
    const rw = Math.max(0, Math.abs(w) / 2 - i);
    const rh = Math.max(0, Math.abs(h) / 2 - i);
    ctx.ellipse(w / 2, h / 2, rw, rh, 0, 0, Math.PI * 2);
    return;
  }
  if (clip.kind === "polygon") {
    const cx = w / 2;
    const cy = h / 2;
    const sx = Math.max(0, (Math.abs(w) - 2 * i) / Math.max(1e-6, Math.abs(w)));
    const sy = Math.max(0, (Math.abs(h) - 2 * i) / Math.max(1e-6, Math.abs(h)));
    clip.vertices.forEach((p, idx) => {
      const x = cx + (p[0] * w - cx) * sx;
      const y = cy + (p[1] * h - cy) * sy;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    return;
  }
  const iw = Math.max(0, w - 2 * i);
  const ih = Math.max(0, h - 2 * i);
  const [tl, tr, br, bl] = clip.cornerRadius.map((r) => Math.max(0, r - i)) as [
    number,
    number,
    number,
    number,
  ];
  const maxR = Math.min(iw, ih) / 2;
  const r = (v: number) => Math.max(0, Math.min(v, maxR));
  roundRect(ctx, i, i, iw, ih, [r(tl), r(tr), r(br), r(bl)]);
}

/**
 * Per-side CSS borders as filled strips inside the box (top/right/bottom/left).
 * Clipped to the rounded rect so corner radii match the DOM adapter.
 */
function paintBorderStrips(
  ctx: CanvasRenderingContext2D,
  node: RenderNode,
  sides: Corners,
  color: RGBA,
): void {
  const w = node.width;
  const h = node.height;
  const [top, right, bottom, left] = sides.map((v) => Math.max(0, v)) as Corners;
  if (!(top > 0 || right > 0 || bottom > 0 || left > 0)) return;
  ctx.save();
  // Clip to the shape so rounded corners match CSS border-radius.
  boxPath(ctx, node);
  ctx.clip();
  ctx.fillStyle = css(color);
  if (top > 0) ctx.fillRect(0, 0, w, Math.min(top, h));
  if (bottom > 0) ctx.fillRect(0, Math.max(0, h - bottom), w, Math.min(bottom, h));
  if (left > 0) ctx.fillRect(0, 0, Math.min(left, w), h);
  if (right > 0) ctx.fillRect(Math.max(0, w - right), 0, Math.min(right, w), h);
  ctx.restore();
}

// --------------------------------------------------------------------- effects ---

type InnerEffect = { x: number; y: number; radius: number; spread: number; color: RGBA };
type NoiseEffect = { size: number; density: number; color: RGBA };
type GlassEffect = { radius: number; color: RGBA };

/**
 * Inset shadow approximation: clip to the shape, then fill the region OUTSIDE the
 * shape (a big rect minus the box, via even-odd) with the shadow enabled so it
 * bleeds inward across the clipped edge.
 */
function paintInnerShadow(ctx: CanvasRenderingContext2D, node: RenderNode, eff: InnerEffect): void {
  const w = node.width;
  const h = node.height;
  ctx.save();
  boxPath(ctx, node);
  ctx.clip();
  const pad = Math.max(Math.abs(w), Math.abs(h)) + (Math.abs(eff.x) + Math.abs(eff.y) + eff.radius + eff.spread) * 2 + 100;
  ctx.beginPath();
  ctx.rect(-pad, -pad, w + pad * 2, h + pad * 2);
  appendBoxPath(ctx, node); // inner hole → even-odd fills only the outside
  ctx.shadowColor = css(eff.color);
  ctx.shadowBlur = Math.max(0, eff.radius + eff.spread);
  ctx.shadowOffsetX = eff.x;
  ctx.shadowOffsetY = eff.y;
  ctx.fillStyle = css(eff.color); // opaque body; only its inward shadow is visible
  ctx.fill("evenodd");
  ctx.restore();
}

/**
 * Effect-level noise overlay. Delegates to the same procedural buffer as
 * `node.shader.kind === "noise"` / DOM caustics so grain matches across backends.
 * `density`/`size` on the effect tint alpha (Figma-ish); base field is shared.
 */
function paintNoise(
  ctx: CanvasRenderingContext2D,
  node: RenderNode,
  eff: NoiseEffect,
  time: number,
): void {
  const w = Math.abs(node.width);
  const h = Math.abs(node.height);
  if (w <= 0 || h <= 0) return;
  ctx.save();
  boxPath(ctx, node);
  ctx.clip();
  // Density scales overall opacity of the shared noise field.
  const density = clamp01(eff.density != null ? eff.density : 0.5);
  ctx.globalAlpha = clamp01(0.35 + density * 0.65);
  // Re-use shader path (identical hash + resolution to DOM).
  paintShader(ctx, "noise", w, h, time);
  ctx.restore();
}

/**
 * Glass / liquid refraction. Canvas can't sample a blurred backdrop, so we
 * approximate it as a translucent tint of `color` over the shape.
 */
function paintGlass(ctx: CanvasRenderingContext2D, node: RenderNode, eff: GlassEffect): void {
  ctx.save();
  boxPath(ctx, node);
  ctx.fillStyle = css(eff.color);
  ctx.fill();
  ctx.restore();
}

function applyTransform(ctx: CanvasRenderingContext2D, node: RenderNode): void {
  ctx.translate(node.x, node.y);
  ctx.translate(node.translateX, node.translateY);
  const ax = node.anchor.x * node.width;
  const ay = node.anchor.y * node.height;
  ctx.translate(ax, ay);
  ctx.rotate((node.rotation * Math.PI) / 180);
  ctx.scale(node.scaleX, node.scaleY);
  ctx.translate(-ax, -ay);
}

function drawNode(ctx: CanvasRenderingContext2D, node: RenderNode, inheritedAlpha: number, time: number): void {
  const alpha = inheritedAlpha * node.opacity;
  if (alpha <= 0) return;
  ctx.save();
  applyTransform(ctx, node);
  ctx.globalAlpha = alpha;

  // Blend mode: CSS names map 1:1 to canvas composite ops. Restored by `restore`.
  if (node.blendMode && node.blendMode !== "normal") {
    ctx.globalCompositeOperation = node.blendMode as GlobalCompositeOperation;
  }

  // drop shadow (first drop effect). Fold `spread` into the blur so it isn't lost.
  const drop = node.effects.find((e) => e.type === "drop") as
    | { x: number; y: number; radius: number; spread: number; color: RGBA }
    | undefined;
  if (drop) {
    ctx.shadowColor = css(drop.color);
    ctx.shadowBlur = Math.max(0, drop.radius + (drop.spread || 0));
    ctx.shadowOffsetX = drop.x;
    ctx.shadowOffsetY = drop.y;
  }

  if (node.type === "text") {
    paintText(ctx, node);
  } else if (node.shape && node.shape.kind === "path") {
    paintVectorPath(ctx, node);
  } else {
    paintFill(ctx, node);
  }

  // reset shadow before overlays/stroke/children so it doesn't bleed onto them
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // procedural shader fill (Figma SHADER / NOISE / "Water caustic"), clipped to the box
  if (node.shader) {
    ctx.save();
    boxPath(ctx, node);
    ctx.clip();
    paintShader(ctx, node.shader.kind, node.width, node.height, time);
    ctx.restore();
  }

  // overlay effects, painted over the body (each self-contained via save/restore)
  for (const e of node.effects) {
    if (e.type === "inner") paintInnerShadow(ctx, node, e as InnerEffect);
    else if (e.type === "glass") paintGlass(ctx, node, e as GlassEffect);
    else if (e.type === "noise" || e.type === "texture")
      paintNoise(ctx, node, e as NoiseEffect, time);
  }

  if (node.stroke && !(node.shape && node.shape.kind === "path")) {
    strokeBorder(ctx, node);
  }

  if (node.clip) {
    boxPath(ctx, node);
    ctx.clip();
  }
  for (const child of node.children) drawNode(ctx, child, alpha, time);
  ctx.restore();
}

/** Paint a full render tree onto a fresh frame. `dpr` scales for hi-dpi. */
export function drawTree(ctx: CanvasRenderingContext2D, tree: RenderTree, dpr = 1): void {
  const { width, height, background } = tree.stage;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Clear in CSS-pixel space (transform applies).
  ctx.clearRect(0, 0, width, height);
  if (background) {
    ctx.fillStyle = css(parseColor(background));
    ctx.fillRect(0, 0, width, height);
  }
  // Clip to the stage rect — matches DOM adapter's `overflow: hidden` on the stage.
  // Without this, drop shadows / scaled layers / off-stage keyframes paint past the
  // frame edge (and can look like content "escaping" the stage in UIs that don't
  // clip the canvas element either).
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.clip();
  for (const node of tree.nodes) drawNode(ctx, node, 1, tree.time);
  ctx.restore();
}
