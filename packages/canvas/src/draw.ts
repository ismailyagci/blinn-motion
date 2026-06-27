/**
 * Canvas painter for a @fottie/core {@link RenderTree}. Walks the resolved node
 * tree, replicating the DOM transform model on a 2D context:
 *   position at (x,y) → CSS translate → rotate/scale around the anchor → draw box
 * Children inherit the parent transform and opacity, exactly like nested DOM.
 */
import {
  parseColor,
  rgbaToCss,
  type RenderNode,
  type RenderTree,
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

/** Build the node's own outline path (in local box coords) into `ctx`. */
function boxPath(ctx: CanvasRenderingContext2D, node: RenderNode): void {
  const w = node.width;
  const h = node.height;
  ctx.beginPath();
  const clip = node.clipShape;
  if (clip.kind === "ellipse") {
    ctx.ellipse(w / 2, h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
    return;
  }
  if (clip.kind === "polygon") {
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
  for (const s of stops) g.addColorStop(Math.max(0, Math.min(1, s.pos)), css(s.color));
  return g;
}

function paintFill(ctx: CanvasRenderingContext2D, node: RenderNode): void {
  const fill = node.fill;
  if (!fill) return;
  boxPath(ctx, node);
  if (fill.type === "solid") {
    ctx.fillStyle = css(fill.color);
    ctx.fill();
  } else if (fill.type === "linear") {
    ctx.fillStyle = makeGradient(ctx, fill.angle, node.width, node.height, fill.stops);
    ctx.fill();
  } else if (fill.type === "image") {
    const img = getImage(fill.src);
    if (img) {
      ctx.save();
      ctx.clip();
      drawCover(ctx, img, node.width, node.height);
      ctx.restore();
    }
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

  // drop shadow (first visible drop effect)
  const drop = node.effects.find((e) => e.type === "drop") as
    | { x: number; y: number; radius: number; color: RGBA }
    | undefined;
  if (drop) {
    ctx.shadowColor = css(drop.color);
    ctx.shadowBlur = drop.radius;
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

  // reset shadow before stroke/children so it doesn't bleed onto them
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  if (node.stroke && node.stroke.weight > 0 && !(node.shape && node.shape.kind === "path")) {
    boxPath(ctx, node);
    ctx.strokeStyle = css(node.stroke.color);
    ctx.lineWidth = node.stroke.weight;
    ctx.stroke();
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
