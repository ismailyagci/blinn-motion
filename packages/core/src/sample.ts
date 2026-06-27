/**
 * `sample(doc, t)` — THE render method.
 *
 * Resolves an entire {@link MotionDoc} at time `t` into a backend-agnostic
 * {@link RenderTree}: every transform/style is a final number or RGBA, ready to
 * paint. The DOM, Canvas, React and React Native adapters all consume this exact
 * output, which is why a layer animates identically across them.
 */
import type {
  ClipShape,
  Layer,
  MotionDoc,
  RenderNode,
  RenderTree,
  ResolvedEffect,
  ResolvedPaint,
  Stage,
} from "./types.js";
import { parseColor } from "./color.js";
import { computeLayer, type LayerState } from "./compose.js";
import { resolveEffects, resolvePaint, resolveStroke, resolveText } from "./paint.js";
import { arcVertices, polygonVertices, starVertices } from "./shapes.js";

const DEFAULT_STAGE: Stage = { width: 300, height: 300, background: "#00000000" };

/** Apply animated gradient-stop overrides (color/pos) to a resolved gradient fill. */
function applyStopOverrides(fill: ResolvedPaint, s: LayerState): ResolvedPaint {
  if (fill.type === "solid" || fill.type === "image") return fill;
  const overrides = s.fillStopOverrides;
  if (!Object.keys(overrides).length) return fill;
  const stops = fill.stops.map((st, i) => {
    const o = overrides[i];
    if (!o) return st;
    return { pos: o.pos != null ? o.pos : st.pos, color: o.color != null ? parseColor(o.color) : st.color };
  });
  return { ...fill, stops };
}

/** Apply animated effect-property overrides (offset/radius/spread/color) per index. */
function applyEffectOverrides(effects: ResolvedEffect[], s: LayerState): ResolvedEffect[] {
  if (!Object.keys(s.effectOverrides).length) return effects;
  return effects.map((e, i) => {
    const o = s.effectOverrides[i];
    if (!o) return e;
    if (e.type === "drop" || e.type === "inner") {
      return {
        ...e,
        x: o.offsetX != null ? o.offsetX : e.x,
        y: o.offsetY != null ? o.offsetY : e.y,
        radius: o.radius != null ? o.radius : e.radius,
        spread: o.spread != null ? o.spread : e.spread,
        color: o.color != null ? parseColor(o.color) : e.color,
      };
    }
    if ("radius" in e && o.radius != null) return { ...e, radius: o.radius };
    return e;
  });
}

function resolveNode(layer: Layer, t: number): RenderNode {
  const base = layer.base || {};
  const s = computeLayer(layer, t);
  const anchor = base.anchor || { x: 0.5, y: 0.5 };

  // fill: solid-color override for solid/empty fills; stop overrides for gradients
  let fill: ResolvedPaint | null = resolvePaint(base.fill);
  if (fill && (fill.type === "linear" || fill.type === "radial" || fill.type === "angular" || fill.type === "diamond")) {
    fill = applyStopOverrides(fill, s);
  }
  if (s.fillColorOverride != null && layer.type !== "text" && (!fill || fill.type === "solid")) {
    fill = { type: "solid", color: parseColor(s.fillColorOverride) };
  }

  // text color override
  const text = resolveText(base.text);
  if (text && s.fillColorOverride != null && layer.type === "text") {
    text.color = parseColor(s.fillColorOverride);
  }

  const shape = base.shape || null;
  const count = s.shapeCount;

  // how this node's own box is clipped
  let clipShape: ClipShape;
  if (shape && shape.kind === "polygon") {
    clipShape = { kind: "polygon", vertices: polygonVertices(count ?? shape.points, shape.rot || 0) };
  } else if (shape && shape.kind === "star") {
    clipShape = { kind: "polygon", vertices: starVertices(count ?? shape.points, shape.ratio, shape.rot || 0) };
  } else if (shape && shape.kind === "arc") {
    clipShape = { kind: "polygon", vertices: arcVertices(shape.startAngle, shape.endAngle, shape.innerRadius) };
  } else if (layer.type === "ellipse") {
    clipShape = { kind: "ellipse" };
  } else {
    clipShape = { kind: "rect", cornerRadius: s.cornerRadius };
  }

  // stroke: animated weight + per-side borders + color override
  const stroke = resolveStroke(base.stroke, s.borderWeights);
  if (stroke) {
    if (!s.borderWeights) stroke.weight = base.stroke ? s.strokeWeight : stroke.weight;
    if (s.strokeColorOverride != null) stroke.color = parseColor(s.strokeColorOverride);
  }

  const effects = applyEffectOverrides(resolveEffects(base.effects), s);

  return {
    id: layer.id,
    name: layer.name || layer.id,
    type: layer.type,
    x: s.x,
    y: s.y,
    width: s.width,
    height: s.height,
    anchor,
    translateX: s.translateX,
    translateY: s.translateY,
    rotation: s.rotation,
    scaleX: s.scaleX,
    scaleY: s.scaleY,
    opacity: s.opacity,
    fill,
    stroke,
    cornerRadius: s.cornerRadius,
    effects,
    blendMode: base.blendMode || "normal",
    clip: !!base.clip,
    clipShape,
    text,
    shape,
    shapeCount: count,
    image: base.image || null,
    shader: base.shader || null,
    trimStart: s.trimStart,
    trimEnd: s.trimEnd,
    isMask: !!layer.isMask,
    children: (layer.children || []).map((c) => resolveNode(c, t)),
  };
}

/** Sample a document at time `t` into a fully resolved render tree. */
export function sample(doc: MotionDoc, t: number): RenderTree {
  return {
    duration: doc.duration,
    stage: doc.stage || DEFAULT_STAGE,
    time: t,
    nodes: (doc.layers || []).map((l) => resolveNode(l, t)),
  };
}

/** Depth-first walk of a render tree (parents before children). */
export function walk(tree: RenderTree, visit: (node: RenderNode, depth: number) => void): void {
  const rec = (n: RenderNode, d: number) => {
    visit(n, d);
    for (const c of n.children) rec(c, d + 1);
  };
  for (const n of tree.nodes) rec(n, 0);
}

/** Find a node by id anywhere in a render tree. */
export function findNode(tree: RenderTree, id: string): RenderNode | null {
  let found: RenderNode | null = null;
  walk(tree, (n) => {
    if (!found && n.id === id) found = n;
  });
  return found;
}
