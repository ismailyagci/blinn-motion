/**
 * Canvas painter for a @fottie/core {@link RenderTree}. Walks the resolved node
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
} from "@fottie/core";

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
    // Arc shapes arrive here too: @fottie/core converts arc → polygon vertices,
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
  const R = Math.max(0, fill.radius) * Math.max(Math.abs(w), Math.abs(h));

  if (fill.type === "angular") {
    // Conic gradient (modern canvas only). Fall back to the radial gradient if
    // the API is missing or throws.
    const anyCtx = ctx as unknown as {
      createConicGradient?: (startAngle: number, x: number, y: number) => CanvasGradient;
    };
    if (typeof anyCtx.createConicGradient === "function") {
      try {
        const start = (fill.angle * Math.PI) / 180;
        const g = anyCtx.createConicGradient(start, cx, cy);
        for (const s of fill.stops) g.addColorStop(clamp01(s.pos), css(s.color));
        return g;
      } catch {
        // fall through to the radial approximation
      }
    }
  }

  // radial (and diamond) → radial gradient.
  // TODO diamond: a true diamond gradient needs a Chebyshev-distance ramp; we
  // approximate it with the same radial gradient for now.
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  for (const s of fill.stops) g.addColorStop(clamp01(s.pos), css(s.color));
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

function paintVectorPath(ctx: CanvasRenderingContext2D, node: RenderNode): void {
  const shape = node.shape;
  if (!shape || shape.kind !== "path") return;
  // PATH_TRIM: node.trimStart / node.trimEnd (0..1) should clip the drawn length.
  // TODO: canvas path trim needs path sampling — the 2D context has no
  // getTotalLength/getPointAtLength on Path2D, so we can't slice a sub-path
  // reliably. Skip trimming for now (draw the full path) rather than block the
  // other features or crash.
  // const trimmed = node.trimStart > 0 || node.trimEnd < 1;
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
      ctx.stroke(p);
    }
  }
}

// --------------------------------------------------------------------- borders ---

function sidesDiffer(s: Corners): boolean {
  return !(s[0] === s[1] && s[1] === s[2] && s[2] === s[3]);
}

/**
 * Stroke the node's border. Uniform (single `boxPath` stroke) unless the node
 * carries per-side weights that differ AND its clip shape is a plain rect — in
 * which case each edge is stroked separately with its own line width.
 */
function strokeBorder(ctx: CanvasRenderingContext2D, node: RenderNode): void {
  const stroke = node.stroke;
  if (!stroke) return;
  const sides = stroke.sides;
  if (sides && node.clipShape.kind === "rect" && sidesDiffer(sides)) {
    strokeSides(ctx, node, sides, stroke.color);
    return;
  }
  if (stroke.weight > 0) {
    boxPath(ctx, node);
    ctx.strokeStyle = css(stroke.color);
    ctx.lineWidth = stroke.weight;
    ctx.stroke();
  }
}

function strokeSides(ctx: CanvasRenderingContext2D, node: RenderNode, sides: Corners, color: RGBA): void {
  const w = node.width;
  const h = node.height;
  const [top, right, bottom, left] = sides;
  ctx.strokeStyle = css(color);
  const edge = (x1: number, y1: number, x2: number, y2: number, weight: number) => {
    if (!(weight > 0)) return;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = weight;
    ctx.stroke();
  };
  edge(0, 0, w, 0, top); // top
  edge(w, 0, w, h, right); // right
  edge(0, h, w, h, bottom); // bottom
  edge(0, 0, 0, h, left); // left
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
 * Procedural monochrome noise overlay clipped to the box. Pseudo-randomness comes
 * from a sine hash of the cell coordinates (no Math.random dependency), in the
 * spirit of @fottie/dom's caustics. `density` drives both coverage and alpha.
 */
function paintNoise(ctx: CanvasRenderingContext2D, node: RenderNode, eff: NoiseEffect): void {
  const w = Math.abs(node.width);
  const h = Math.abs(node.height);
  if (w <= 0 || h <= 0) return;
  const density = clamp01(eff.density != null ? eff.density : 0.5);
  const cell = Math.max(1, eff.size || 2);
  // Cap the grid so a huge box can't explode the loop (best-effort overlay).
  const cols = Math.min(400, Math.ceil(w / cell));
  const rows = Math.min(400, Math.ceil(h / cell));
  const cw = w / cols;
  const ch = h / rows;
  ctx.save();
  boxPath(ctx, node);
  ctx.clip();
  ctx.fillStyle = css(eff.color);
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      if (hash2(gx, gy) < density) {
        ctx.globalAlpha = clamp01(density * (0.35 + 0.65 * hash2(gy + 1, gx + 1)));
        ctx.fillRect(gx * cw, gy * ch, cw, ch);
      }
    }
  }
  ctx.restore();
}

/** Classic GLSL `fract(sin(dot)*k)` hash → pseudo-random 0..1 from integer coords. */
function hash2(x: number, y: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
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

function drawNode(ctx: CanvasRenderingContext2D, node: RenderNode, inheritedAlpha: number): void {
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

  // overlay effects, painted over the body (each self-contained via save/restore)
  for (const e of node.effects) {
    if (e.type === "inner") paintInnerShadow(ctx, node, e as InnerEffect);
    else if (e.type === "glass") paintGlass(ctx, node, e as GlassEffect);
    else if (e.type === "noise" || e.type === "texture") paintNoise(ctx, node, e as NoiseEffect);
  }

  if (node.stroke && !(node.shape && node.shape.kind === "path")) {
    strokeBorder(ctx, node);
  }

  if (node.clip) {
    boxPath(ctx, node);
    ctx.clip();
  }
  for (const child of node.children) drawNode(ctx, child, alpha);
  ctx.restore();
}

/** Paint a full render tree onto a fresh frame. `dpr` scales for hi-dpi. */
export function drawTree(ctx: CanvasRenderingContext2D, tree: RenderTree, dpr = 1): void {
  const { width, height, background } = tree.stage;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  if (background) {
    ctx.fillStyle = css(parseColor(background));
    ctx.fillRect(0, 0, width, height);
  }
  for (const node of tree.nodes) drawNode(ctx, node, 1);
}
