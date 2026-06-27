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

/**
 * Normalized property names (see SCHEMA.md for the Figma mapping).
 *
 * Besides the named members below, indexed tracks use a `collection:index:field`
 * convention so animations can target a specific effect / gradient stop:
 *   - `effect:<i>:offsetX|offsetY|radius|spread|color`  (animated shadows/effects)
 *   - `fillStop:<i>:color|pos`                          (animated gradient stops)
 */
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
  | "strokeColor"
  | "borderTopWeight"
  | "borderRightWeight"
  | "borderBottomWeight"
  | "borderLeftWeight"
  | "polygonCount"
  | "fillColor"
  | "trimStart"
  | "trimEnd"
  // auto-layout / grid (data-preserved; renderers may reflow)
  | "stackSpacing"
  | "stackPaddingTop"
  | "stackPaddingRight"
  | "stackPaddingBottom"
  | "stackPaddingLeft"
  | "stackCounterSpacing"
  | "gridRowGap"
  | "gridColumnGap"
  | (string & {});

/** A gradient kind. `linear` = along an axis, `radial`/`diamond` = from a center, `angular` = conic sweep. */
export type GradientKind = "linear" | "radial" | "angular" | "diamond";

export type Paint =
  | { type: "solid"; color: string | RGBA }
  | {
      type: GradientKind;
      /** Linear/conic angle in degrees. */
      angle?: number;
      /** Center for radial/angular/diamond, 0..1 of the box. */
      center?: { x: number; y: number };
      /**
       * Outer radius for radial/diamond, as a fraction of `max(width, height)`
       * (DOM: `ellipse <radius*100>%`; canvas: `radius * max(w,h)` px). So ~0.5
       * reaches the nearest edge from a centered origin; default 0.7.
       */
      radius?: number;
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
  | { type: "bgblur"; radius?: number; visible?: boolean }
  /** Glass / liquid refraction (approximated as a tinted backdrop blur). */
  | { type: "glass"; radius?: number; color?: string | RGBA; visible?: boolean }
  /** Procedural monochrome noise overlay. */
  | { type: "noise"; size?: number; density?: number; color?: string | RGBA; visible?: boolean }
  /** Texture overlay (approximated as noise). */
  | { type: "texture"; size?: number; visible?: boolean };

/** CSS / canvas blend modes (a subset of Figma's BlendMode). */
export type BlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn"
  | "hard-light"
  | "soft-light"
  | "difference"
  | "exclusion"
  | "hue"
  | "saturation"
  | "color"
  | "luminosity";

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
  /** Ellipse arc / pie / donut (Figma arcData). Angles in degrees, innerRadius 0..1. */
  | { kind: "arc"; startAngle?: number; endAngle?: number; innerRadius?: number }
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
  /** Per-side border weights [top, right, bottom, left]; overrides stroke.weight when set. */
  borderWeights?: Corners;
  text?: TextStyle | null;
  image?: string | null;
  shape?: Shape | null;
  effects?: Effect[];
  /** Procedural fill (e.g. `{ kind: "caustics" }` or `{ kind: "noise" }`). */
  shader?: { kind: string } | null;
  /** Layer blend mode. */
  blendMode?: BlendMode;
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
  | {
      type: GradientKind;
      angle: number;
      center: { x: number; y: number };
      radius: number;
      stops: Array<{ pos: number; color: RGBA }>;
    }
  | { type: "image"; src: string; fit: "cover" | "contain" | "fill" };

export interface ResolvedStroke {
  color: RGBA;
  weight: number;
  /** Per-side weights [top, right, bottom, left] when borders differ; else null. */
  sides: Corners | null;
}

export type ResolvedEffect =
  | { type: "drop" | "inner"; x: number; y: number; radius: number; spread: number; color: RGBA }
  | { type: "blur" | "bgblur"; radius: number }
  | { type: "glass"; radius: number; color: RGBA }
  | { type: "noise" | "texture"; size: number; density: number; color: RGBA };

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
  blendMode: BlendMode;
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
