/**
 * Fottie type model.
 *
 * Two halves live here:
 *   1. The **MotionDoc** — the on-disk document the Figma plugin emits and the
 *      engine consumes (the authored, declarative input).
 *   2. The **resolved render tree** — what {@link sample} produces at a given
 *      time `t`. Every value is a plain number / RGBA / vertex list with no CSS,
 *      no DOM, no platform assumptions. This is the single contract every adapter
 *      (DOM, Canvas, React, React Native) paints from.
 */

// ----------------------------------------------------------------- primitives ---

/** Color with channels in 0..255 and alpha in 0..1. The engine's internal color. */
export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** A 2D point / vector, components as a tuple. */
export type Vec2 = [number, number];

/** Corner radii in CSS order: [topLeft, topRight, bottomRight, bottomLeft]. */
export type Corners = [number, number, number, number];

// -------------------------------------------------------------------- easing ---

export type Easing =
  | { type: "linear" }
  | { type: "hold" }
  /** Cubic bezier control points [x1, y1, x2, y2]; y may exceed 0..1 (overshoot). */
  | { type: "cubicBezier"; p: [number, number, number, number] }
  /** Perceptual spring: bounce 0 (no overshoot) .. 1 (very wobbly). */
  | { type: "spring"; bounce: number };

// ------------------------------------------------------------------- authored ---

/** A single keyframe. `t` is absolute seconds on the timeline. */
export interface Keyframe<V = KeyframeValue> {
  t: number;
  v: V;
  /** Governs interpolation FROM this keyframe to the next (last key's easing is ignored). */
  easing?: Easing;
}

export type KeyframeValue = number | Vec2 | string | boolean;

/** How a track's interpolated value combines with its `base`. */
export type TrackOp = "set" | "offset" | "scale";

/** One animated property over time. */
export interface Track {
  property: PropertyName;
  op?: TrackOp;
  unit?: "px" | "deg" | "ratio" | "none";
  base?: KeyframeValue;
  keys: Keyframe[];
}

/** Normalized property names (see SCHEMA.md for the Figma mapping). */
export type PropertyName =
  | "translateX"
  | "translateY"
  | "translateXY"
  | "rotation"
  | "scaleX"
  | "scaleY"
  | "scaleXY"
  | "opacity"
  | "width"
  | "height"
  | "cornerRadiusTL"
  | "cornerRadiusTR"
  | "cornerRadiusBR"
  | "cornerRadiusBL"
  | "strokeWeight"
  | "polygonCount"
  | "fillColor"
  | "trimStart"
  | "trimEnd"
  | (string & {});

export type Paint =
  | { type: "solid"; color: string | RGBA }
  | {
      type: "linear";
      angle?: number;
      stops: Array<{ pos: number; color: string | RGBA }>;
    }
  | { type: "image"; src: string; fit?: "cover" | "contain" | "fill" };

export interface Stroke {
  color: string | RGBA;
  weight: number;
}

export type Effect =
  | { type: "drop"; x?: number; y?: number; radius?: number; spread?: number; color?: string | RGBA; visible?: boolean }
  | { type: "inner"; x?: number; y?: number; radius?: number; spread?: number; color?: string | RGBA; visible?: boolean }
  | { type: "blur"; radius?: number; visible?: boolean }
  | { type: "bgblur"; radius?: number; visible?: boolean };

export interface TextStyle {
  characters: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  color?: string | RGBA;
  lineHeight?: number;
  letterSpacing?: number;
  align?: "left" | "center" | "right";
}

export type Shape =
  | { kind: "polygon"; points: number; rot?: number }
  | { kind: "star"; points: number; ratio?: number; rot?: number }
  | {
      kind: "path";
      vw?: number;
      vh?: number;
      paths: Array<{
        d: string;
        fill?: string | null;
        stroke?: string | null;
        strokeWidth?: number;
        cap?: "butt" | "round" | "square";
        markerEnd?: "arrow";
        markerStart?: "arrow";
      }>;
    };

export type LayerType =
  | "rect"
  | "ellipse"
  | "text"
  | "image"
  | "vector"
  | "group";

/** Static, authored base of a layer (the value before any track animates it). */
export interface LayerBase {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  opacity?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  anchor?: { x: number; y: number };
  cornerRadius?: Corners;
  fill?: Paint | null;
  stroke?: Stroke | null;
  text?: TextStyle | null;
  image?: string | null;
  shape?: Shape | null;
  effects?: Effect[];
  /** Procedural fill (e.g. `{ kind: "caustics" }`). */
  shader?: { kind: string } | null;
  clip?: boolean;
}

export interface Layer {
  id: string;
  name?: string;
  type: LayerType;
  base?: LayerBase;
  tracks?: Track[];
  children?: Layer[];
  /** Figma "Mask group": this child clips its siblings. */
  isMask?: boolean;
}

export interface Stage {
  width: number;
  height: number;
  background?: string | RGBA;
}

export interface MotionDoc {
  format?: string;
  version?: string;
  meta?: { name?: string; source?: string; figmaNodeId?: string; [k: string]: unknown };
  /** Timeline length, seconds. */
  duration: number;
  /** Suggested sampling fps (engine itself is time-based). */
  fps?: number;
  stage?: Stage;
  layers: Layer[];
}

// -------------------------------------------------------------------- resolved ---

export type ResolvedPaint =
  | { type: "solid"; color: RGBA }
  | { type: "linear"; angle: number; stops: Array<{ pos: number; color: RGBA }> }
  | { type: "image"; src: string; fit: "cover" | "contain" | "fill" };

export interface ResolvedStroke {
  color: RGBA;
  weight: number;
}

export type ResolvedEffect =
  | { type: "drop" | "inner"; x: number; y: number; radius: number; spread: number; color: RGBA }
  | { type: "blur" | "bgblur"; radius: number };

export interface ResolvedText extends Omit<TextStyle, "color"> {
  color: RGBA;
}

/** How a node's own box is clipped. Polygon/star carry their unit-square vertices. */
export type ClipShape =
  | { kind: "rect"; cornerRadius: Corners }
  | { kind: "ellipse" }
  | { kind: "polygon"; vertices: Vec2[] };

/**
 * A fully resolved render node at one instant. All transforms/styles are final
 * absolute values — the adapter only has to draw them. Coordinates are in the
 * parent's local space; children inherit the parent transform.
 */
export interface RenderNode {
  id: string;
  name: string;
  type: LayerType;

  // box (parent-local, pre-transform)
  x: number;
  y: number;
  width: number;
  height: number;
  anchor: { x: number; y: number };

  // transform (applied around `anchor`, in this order: translate, rotate, scale)
  translateX: number;
  translateY: number;
  rotation: number; // degrees
  scaleX: number;
  scaleY: number;
  opacity: number;

  // style
  fill: ResolvedPaint | null;
  stroke: ResolvedStroke | null;
  cornerRadius: Corners;
  effects: ResolvedEffect[];
  clip: boolean;
  clipShape: ClipShape;

  // type-specific
  text: ResolvedText | null;
  shape: Shape | null;
  /** For polygon/star: the live vertex count (may be fractional mid-morph). */
  shapeCount: number | null;
  image: string | null;
  shader: { kind: string } | null;
  /** Path-trim, 0..1 (PATH_TRIM_START/END). */
  trimStart: number;
  trimEnd: number;

  isMask: boolean;
  children: RenderNode[];
}

export interface RenderTree {
  duration: number;
  stage: Stage;
  /** The time this tree was sampled at, seconds. */
  time: number;
  nodes: RenderNode[];
}
