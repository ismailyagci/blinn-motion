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
  ResolvedPaint,
  Stage,
} from "./types.js";
import { parseColor } from "./color.js";
import { computeLayer } from "./compose.js";
import { resolveEffects, resolvePaint, resolveStroke, resolveText } from "./paint.js";
import { polygonVertices, starVertices } from "./shapes.js";

const DEFAULT_STAGE: Stage = { width: 300, height: 300, background: "#00000000" };

function resolveNode(layer: Layer, t: number): RenderNode {
  const base = layer.base || {};
  const s = computeLayer(layer, t);
  const anchor = base.anchor || { x: 0.5, y: 0.5 };

  // fill, with an animated solid-color override applied for non-text layers
  let fill: ResolvedPaint | null = resolvePaint(base.fill);
  if (s.fillColorOverride != null && layer.type !== "text") {
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
  } else if (layer.type === "ellipse") {
    clipShape = { kind: "ellipse" };
  } else {
    clipShape = { kind: "rect", cornerRadius: s.cornerRadius };
  }

  const baseStroke = resolveStroke(base.stroke);

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
    stroke: baseStroke ? { color: baseStroke.color, weight: s.strokeWeight } : null,
    cornerRadius: s.cornerRadius,
    effects: resolveEffects(base.effects),
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
