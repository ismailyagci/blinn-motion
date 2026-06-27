// motion-to-code — Figma plugin main thread.
//
// Reads the selected (animated) frame's Motion data via the Figma Motion Plugin API
// (node.animations / node.timelines — see @figma/plugin-typings MotionNodeMixin),
// produces:
//   1) `raw`  — a faithful, full JSON dump of the Figma-side motion (keyframes/easing as Figma stores them)
//   2) `doc`  — our own engine format (MotionDoc, see engine/SCHEMA.md), played by motion-engine.js
// and posts both to the UI for preview / download.

figma.showUI(__html__, { width: 880, height: 600, themeColors: true });

// ---------------------------------------------------------------- helpers ---

const PROP_MAP: Record<string, string> = {
  TRANSLATION_X: 'translateX',
  TRANSLATION_Y: 'translateY',
  TRANSLATION_XY: 'translateXY',
  ROTATION: 'rotation',
  SCALE_X: 'scaleX',
  SCALE_Y: 'scaleY',
  SCALE_XY: 'scaleXY',
  OPACITY: 'opacity',
  WIDTH: 'width',
  HEIGHT: 'height',
  STROKE_WEIGHT: 'strokeWeight',
  POLYGON_COUNT: 'polygonCount',
  RECTANGLE_TOP_LEFT_CORNER_RADIUS: 'cornerRadiusTL',
  RECTANGLE_TOP_RIGHT_CORNER_RADIUS: 'cornerRadiusTR',
  RECTANGLE_BOTTOM_RIGHT_CORNER_RADIUS: 'cornerRadiusBR',
  RECTANGLE_BOTTOM_LEFT_CORNER_RADIUS: 'cornerRadiusBL',
  PATH_TRIM_START: 'trimStart',
  PATH_TRIM_END: 'trimEnd',
  // per-side border weights
  BORDER_TOP_WEIGHT: 'borderTopWeight',
  BORDER_RIGHT_WEIGHT: 'borderRightWeight',
  BORDER_BOTTOM_WEIGHT: 'borderBottomWeight',
  BORDER_LEFT_WEIGHT: 'borderLeftWeight',
  // auto-layout / grid (data-preserved; engine may reflow)
  STACK_SPACING: 'stackSpacing',
  STACK_PADDING_TOP: 'stackPaddingTop',
  STACK_PADDING_RIGHT: 'stackPaddingRight',
  STACK_PADDING_BOTTOM: 'stackPaddingBottom',
  STACK_PADDING_LEFT: 'stackPaddingLeft',
  STACK_COUNTER_SPACING: 'stackCounterSpacing',
  GRID_ROW_GAP: 'gridRowGap',
  GRID_COLUMN_GAP: 'gridColumnGap',
};

// Figma BlendMode -> CSS mix-blend-mode (PASS_THROUGH / NORMAL -> normal).
const BLEND_MAP: Record<string, string> = {
  MULTIPLY: 'multiply', SCREEN: 'screen', OVERLAY: 'overlay', DARKEN: 'darken',
  LIGHTEN: 'lighten', COLOR_DODGE: 'color-dodge', COLOR_BURN: 'color-burn',
  HARD_LIGHT: 'hard-light', SOFT_LIGHT: 'soft-light', DIFFERENCE: 'difference',
  EXCLUSION: 'exclusion', HUE: 'hue', SATURATION: 'saturation', COLOR: 'color',
  LUMINOSITY: 'luminosity',
};
// EffectKeyframeFieldName -> our effect override field
const EFFECT_FIELD_MAP: Record<string, string> = {
  OFFSET_X: 'offsetX', OFFSET_Y: 'offsetY', RADIUS: 'radius', SPREAD: 'spread', COLOR: 'color',
};

// corner radii that should expand into all four corners
const CORNER_ALL = 'CORNER_RADIUS';

function hex2(n: number): string {
  const v = Math.max(0, Math.min(255, Math.round(n)));
  return (v < 16 ? '0' : '') + v.toString(16);
}
// Figma RGB(A) channels are 0..1
function rgbaToHex(c: { r: number; g: number; b: number; a?: number }): string {
  const a = c.a == null ? 1 : c.a;
  return '#' + hex2(c.r * 255) + hex2(c.g * 255) + hex2(c.b * 255) + hex2(a * 255);
}

function paintToOur(paint: Paint | undefined): any {
  if (!paint || paint.visible === false) return null;
  if (paint.type === 'SOLID') {
    const o = paint.opacity == null ? 1 : paint.opacity;
    return { type: 'solid', color: rgbaToHex({ r: paint.color.r, g: paint.color.g, b: paint.color.b, a: o }) };
  }
  if (paint.type === 'GRADIENT_LINEAR' || paint.type === 'GRADIENT_RADIAL' ||
      paint.type === 'GRADIENT_ANGULAR' || paint.type === 'GRADIENT_DIAMOND') {
    const gp = paint as GradientPaint;
    const stops = gp.gradientStops.map((s) => ({
      pos: s.position, color: rgbaToHex({ r: s.color.r, g: s.color.g, b: s.color.b, a: s.color.a }),
    }));
    // gradientHandlePositions: [start/center, end, width] in 0..1 of the box.
    let center = { x: 0.5, y: 0.5 };
    let radius = 0.7;
    let angle = 180;
    try {
      const hp = (gp as any).gradientHandlePositions;
      if (hp && hp.length >= 2) {
        center = { x: hp[0].x, y: hp[0].y };
        const dx = hp[1].x - hp[0].x, dy = hp[1].y - hp[0].y;
        radius = Math.sqrt(dx * dx + dy * dy) || 0.7;
        angle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
      }
    } catch (e) {}
    if (paint.type === 'GRADIENT_LINEAR') {
      // linear angle is more reliable from the transform matrix (existing path)
      try { const gt = gp.gradientTransform; angle = Math.round((Math.atan2(gt[1][0], gt[0][0]) * 180) / Math.PI) + 90; } catch (e) {}
      return { type: 'linear', angle, stops };
    }
    if (paint.type === 'GRADIENT_RADIAL') return { type: 'radial', center, radius, stops };
    if (paint.type === 'GRADIENT_DIAMOND') return { type: 'diamond', center, radius, stops };
    return { type: 'angular', center, angle: angle + 90, stops };
  }
  if (paint.type === 'IMAGE') return { type: 'solid', color: '#888888FF' }; // image data needs async export; placeholder for v1
  return null;
}

function firstVisiblePaint(paints: ReadonlyArray<Paint> | typeof figma.mixed | undefined): Paint | undefined {
  if (!paints || paints === figma.mixed || !Array.isArray(paints)) return undefined;
  return (paints as Paint[]).find((p) => p.visible !== false);
}

// Figma effects -> our effect list (engine renders these as CSS box-shadow / filter).
// Rendering effects natively means an effect no longer forces a node to rasterize (which
// baked degenerate snapshots — e.g. a scale-0 entrance exported as a 1x1 PNG).
function effectsToOur(node: any): any[] {
  const out: any[] = [];
  try {
    const fx = node.effects;
    if (!fx || !Array.isArray(fx)) return out;
    for (const e of fx) {
      if (e.visible === false) continue;
      if (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') {
        out.push({ type: e.type === 'INNER_SHADOW' ? 'inner' : 'drop',
          x: e.offset ? e.offset.x : 0, y: e.offset ? e.offset.y : 0,
          radius: e.radius || 0, spread: e.spread || 0,
          color: rgbaToHex({ r: e.color.r, g: e.color.g, b: e.color.b, a: e.color.a == null ? 1 : e.color.a }) });
      } else if (e.type === 'LAYER_BLUR') {
        out.push({ type: 'blur', radius: e.radius || 0 });
      } else if (e.type === 'BACKGROUND_BLUR') {
        out.push({ type: 'bgblur', radius: e.radius || 0 });
      } else if (e.type === 'GLASS') {
        // glass/liquid: approximate as a frosted (blurred) translucent surface
        out.push({ type: 'glass', radius: e.radius || 8, color: '#FFFFFF22' });
      } else if (e.type === 'NOISE') {
        out.push({ type: 'noise',
          size: e.noiseSize || 1,
          density: e.density == null ? 0.5 : e.density,
          color: e.color ? rgbaToHex({ r: e.color.r, g: e.color.g, b: e.color.b, a: e.color.a == null ? 1 : e.color.a }) : '#000000FF' });
      } else if (e.type === 'TEXTURE') {
        out.push({ type: 'texture', size: e.noiseSize || e.radius || 1 });
      }
    }
  } catch (e) {}
  return out;
}

// SVG-path nodes (freeform vectors) can only show a SOLID fill via our path renderer; a
// box/clip node (rect/ellipse/polygon/star) can also do a CSS linear-gradient. Anything
// else — image, shader, pattern, radial, OR a gradient on a freeform path — must rasterize.
function isPathNode(node: any): boolean {
  return node.type === 'VECTOR' || node.type === 'LINE' || node.type === 'BOOLEAN_OPERATION';
}
function hasTextureFill(node: any): boolean {
  try {
    const fills = node.fills;
    if (!fills || fills === figma.mixed || !Array.isArray(fills)) return false;
    for (const p of fills) {
      if (p.visible === false) continue;
      if (p.type === 'SOLID') continue;
      // all gradient kinds now render natively (CSS / canvas) on box/clip nodes
      if ((p.type === 'GRADIENT_LINEAR' || p.type === 'GRADIENT_RADIAL' ||
           p.type === 'GRADIENT_ANGULAR' || p.type === 'GRADIENT_DIAMOND') && !isPathNode(node)) continue;
      return true; // image/shader/pattern, or a gradient on a freeform path
    }
  } catch (e) {}
  return false;
}

// Effects we CAN'T express as CSS box-shadow / filter (shaders, noise, texture, glass…).
// Such a node must still rasterize so its appearance (e.g. the water-shader polygon) survives.
const SUPPORTED_EFFECTS = ['DROP_SHADOW', 'INNER_SHADOW', 'LAYER_BLUR', 'BACKGROUND_BLUR', 'GLASS', 'NOISE', 'TEXTURE'];
function hasUnsupportedEffect(node: any): boolean {
  try {
    const fx = node.effects;
    if (!fx || !Array.isArray(fx)) return false;
    for (const e of fx) {
      if (e.visible === false) continue;
      if (SUPPORTED_EFFECTS.indexOf(e.type) < 0) return true;
    }
  } catch (e) {}
  return false;
}

// Geometry of a shape node, so the engine can draw it natively (resolution-independent,
// animatable) instead of rasterizing it:
//   POLYGON/STAR -> regular n-gon / star via clip-path (POLYGON_COUNT can morph it)
//   VECTOR/LINE/BOOLEAN -> SVG path(s) from node.vectorPaths (stroke width can animate)
function shapeOf(node: any): any {
  try {
    if (node.type === 'POLYGON') {
      return { kind: 'polygon', points: typeof node.pointCount === 'number' ? node.pointCount : 3 };
    }
    if (node.type === 'STAR') {
      return { kind: 'star', points: typeof node.pointCount === 'number' ? node.pointCount : 5,
        ratio: typeof node.innerRadius === 'number' ? node.innerRadius : 0.4 };
    }
    if (node.type === 'VECTOR' || node.type === 'LINE' || node.type === 'BOOLEAN_OPERATION') {
      const vps = node.vectorPaths;
      if (!vps || vps === figma.mixed || !Array.isArray(vps) || !vps.length) return null;
      const fillPaint = firstVisiblePaint(node.fills);
      const fillCol = fillPaint && fillPaint.type === 'SOLID'
        ? rgbaToHex({ r: fillPaint.color.r, g: fillPaint.color.g, b: fillPaint.color.b, a: fillPaint.opacity == null ? 1 : fillPaint.opacity }) : null;
      const strokePaint = firstVisiblePaint(node.strokes);
      const strokeCol = strokePaint && strokePaint.type === 'SOLID'
        ? rgbaToHex({ r: strokePaint.color.r, g: strokePaint.color.g, b: strokePaint.color.b, a: strokePaint.opacity == null ? 1 : strokePaint.opacity }) : null;
      const sw = (node.strokeWeight && node.strokeWeight !== figma.mixed) ? node.strokeWeight : 1;
      // Arrowheads + line caps. Figma stores caps PER VERTEX, so a line with an arrow on
      // only one end reports node.strokeCap as figma.mixed — the single-value path misses it.
      // Read the vectorNetwork's endpoint caps so a one-sided arrow (NONE,ARROW_LINES) is
      // detected and mapped to markerStart / markerEnd (the engine draws an SVG arrowhead).
      let cap = 'butt'; let markerStart = false; let markerEnd = false;
      try {
        const sc = node.strokeCap;
        if (typeof sc === 'string') {
          if (sc.indexOf('ARROW') >= 0) markerEnd = true;
          else if (sc === 'ROUND') cap = 'round';
          else if (sc === 'SQUARE') cap = 'square';
        } else {
          const vn = (node as any).vectorNetwork;
          const vtx = vn && vn.vertices;
          if (vtx && vtx.length) {
            if (String(vtx[0].strokeCap || '').indexOf('ARROW') >= 0) markerStart = true;
            if (String(vtx[vtx.length - 1].strokeCap || '').indexOf('ARROW') >= 0) markerEnd = true;
          }
        }
      } catch (e) {}
      const paths = vps.map((vp: any) => {
        const p: any = { d: vp.data, fill: fillCol, stroke: strokeCol, strokeWidth: sw, cap };
        if (markerEnd) p.markerEnd = 'arrow';
        if (markerStart) p.markerStart = 'arrow';
        return p;
      });
      return { kind: 'path', vw: Math.round(node.width || 1), vh: Math.round(node.height || 0), paths };
    }
  } catch (e) {}
  return null;
}

function cornerArray(node: any): number[] {
  if (typeof node.cornerRadius === 'number') {
    const r = node.cornerRadius; return [r, r, r, r];
  }
  return [
    node.topLeftRadius || 0, node.topRightRadius || 0,
    node.bottomRightRadius || 0, node.bottomLeftRadius || 0,
  ];
}

// KeyframeValue -> our scalar/vector/color/primitive
function convValue(kv: any): any {
  if (!kv || typeof kv !== 'object') return kv;
  switch (kv.type) {
    case 'FLOAT': return kv.value;
    case 'BOOL': return kv.value;
    case 'TEXT_DATA': return kv.value;
    case 'VECTOR': return [kv.value.x, kv.value.y];
    case 'COLOR': return rgbaToHex(kv.value);
    case 'COLOR_POINT': return kv.value && kv.value.color ? rgbaToHex(kv.value.color) : null;
    // CIRCLE / LINE / CIRCLE_POINT (gradient/shape handles) — not yet mapped; ignore safely
    default: return null;
  }
}

const PRESET_BEZIER: Record<string, number[]> = {
  EASE_IN: [0.41, 0, 1, 1],
  EASE_OUT: [0, 0, 0.59, 1],
  EASE_IN_AND_OUT: [0.41, 0, 0.59, 1],
  EASE_IN_BACK: [0.36, 0, 0.66, -0.56],
  EASE_OUT_BACK: [0.34, 1.56, 0.64, 1],
  EASE_IN_AND_OUT_BACK: [0.68, -0.6, 0.32, 1.6],
};
const PRESET_SPRING: Record<string, number> = { GENTLE: 0.2, QUICK: 0.1, BOUNCY: 0.6, SLOW: 0.05 };

// MotionEasing -> our easing
function convEasing(me: any): any {
  if (!me || typeof me !== 'object' || !me.type) return { type: 'linear' };
  const t = me.type;
  if (t === 'LINEAR') return { type: 'linear' };
  if (t === 'HOLD') return { type: 'hold' };
  if (t === 'CUSTOM_CUBIC_BEZIER' && me.easingFunctionCubicBezier) {
    const b = me.easingFunctionCubicBezier;
    return { type: 'cubicBezier', p: [b.x1, b.y1, b.x2, b.y2] };
  }
  if (t === 'CUSTOM_SPRING' && me.easingFunctionSpring) {
    return { type: 'spring', bounce: me.easingFunctionSpring.bounce };
  }
  if (PRESET_BEZIER[t]) return { type: 'cubicBezier', p: PRESET_BEZIER[t] };
  if (PRESET_SPRING[t] != null) return { type: 'spring', bounce: PRESET_SPRING[t] };
  return { type: 'linear' };
}

// Convert one Figma KeyframeBinding (for one property) into our track(s).
function bindingToTracks(figmaProp: string, binding: any): any[] {
  // Figma ROTATION is counter-clockwise-positive; CSS rotate is clockwise-positive.
  const negate = figmaProp === 'ROTATION';
  const fix = (v: any) => (negate && typeof v === 'number' ? -v : v);
  const base = binding.baseValue !== undefined ? fix(convValue(binding.baseValue)) : undefined;
  const tracks = binding.tracks || [];
  const out: any[] = [];
  for (const tr of tracks) {
    const op = (tr.keyframeOperation || 'SET').toLowerCase();
    const keys = (tr.keyframes || []).map((k: any) => ({
      t: k.timelinePosition,
      v: fix(convValue(k.value)),
      easing: convEasing(k.easing),
    })).filter((k: any) => k.v != null);
    if (keys.length < 1) continue;

    const ourProps = figmaProp === CORNER_ALL
      ? ['cornerRadiusTL', 'cornerRadiusTR', 'cornerRadiusBR', 'cornerRadiusBL']
      : [PROP_MAP[figmaProp]];

    for (const property of ourProps) {
      if (!property) continue;
      out.push({ property, op, base, keys });
    }
  }
  return out;
}

// Count of nodes whose animations could not be read this export (reset per export).
let readSkips = 0;
// Set true by nodeTracks() when the most recent node's animation was completely unreadable.
let lastReadFailed = false;

// Read all animatable properties off a node's `animations` and build MotionDoc tracks.
// The Motion API is Beta: `node.animations` can throw on some nodes ("Unsupported base
// value type") in large/complex motions. Isolate per node (and per property) so one bad
// node never fails the whole export — it just renders static.
// Fallback path: manualKeyframeTracks has a simpler shape (Record<prop, {baseValue,
// keyframes}>) and a separate serializer that sometimes survives when `animations` throws.
function manualTracksToOur(mkt: any): any[] {
  const out: any[] = [];
  let keys: string[] = [];
  try { keys = Object.keys(mkt); } catch (e) { return []; }
  for (const key of keys) {
    try {
      if (key === 'fills' || key === 'strokes' || key === 'effects') continue;
      const binding = mkt[key];
      if (!binding || !binding.keyframes) continue;
      const negate = key === 'ROTATION';
      const fix = (v: any) => (negate && typeof v === 'number' ? -v : v);
      const ks = (binding.keyframes || []).map((k: any) => ({
        t: k.timelinePosition, v: fix(convValue(k.value)), easing: convEasing(k.easing),
      })).filter((k: any) => k.v != null);
      if (ks.length < 1) continue;
      const base = binding.baseValue !== undefined ? fix(convValue(binding.baseValue)) : undefined;
      const ourProps = key === CORNER_ALL
        ? ['cornerRadiusTL', 'cornerRadiusTR', 'cornerRadiusBR', 'cornerRadiusBL']
        : [PROP_MAP[key]];
      for (const property of ourProps) if (property) out.push({ property, op: 'set', base, keys: ks });
    } catch (e) {}
  }
  return out;
}

// Process a readable Figma `animations` object into our track list.
function tracksFromAnims(anims: any): any[] {
  const tracks: any[] = [];
  let propKeys: string[] = [];
  try { propKeys = Object.keys(anims); } catch (e) { return tracks; }
  for (const key of propKeys) {
    try {
      if (key === 'fills' || key === 'strokes' || key === 'effects') {
        // Indexed collections: fills[i] / strokes[i] color, effects[i].<field>, and
        // animated gradient stops (COLOR_POINT). The Beta API's exact shape varies, so
        // we probe both "binding with .tracks" and "record keyed by field" forms.
        const coll = anims[key];
        if (!coll) continue;
        for (const idx of Object.keys(coll)) {
          const entry = coll[idx];
          if (!entry) continue;
          const bindings: Array<{ field: any; binding: any }> = entry.tracks
            ? [{ field: entry.field, binding: entry }]
            : Object.keys(entry).map((f) => ({ field: f, binding: (entry as any)[f] }));
          for (const { field, binding } of bindings) {
            if (!binding || !binding.tracks) continue;
            const baseV = binding.baseValue !== undefined ? convValue(binding.baseValue) : undefined;
            for (const tr of binding.tracks) {
              const op = (tr.keyframeOperation || 'SET').toLowerCase();
              const scalar: any[] = [];
              const stopColor: any[] = [];
              const stopPos: any[] = [];
              for (const k of tr.keyframes || []) {
                const val: any = k.value;
                const ease = convEasing(k.easing);
                if (val && val.type === 'COLOR_POINT' && val.value) {
                  stopColor.push({ t: k.timelinePosition, v: rgbaToHex(val.value.color), easing: ease });
                  stopPos.push({ t: k.timelinePosition, v: val.value.x, easing: ease });
                } else {
                  const cv = convValue(val);
                  if (cv != null) scalar.push({ t: k.timelinePosition, v: cv, easing: ease });
                }
              }
              if (key === 'fills') {
                if (scalar.length) tracks.push({ property: 'fillColor', op, base: baseV, keys: scalar });
                if (stopColor.length) tracks.push({ property: 'fillStop:' + idx + ':color', op: 'set', keys: stopColor });
                if (stopPos.length) tracks.push({ property: 'fillStop:' + idx + ':pos', op: 'set', keys: stopPos });
              } else if (key === 'strokes') {
                if (scalar.length) tracks.push({ property: 'strokeColor', op, base: baseV, keys: scalar });
              } else if (key === 'effects') {
                const f = EFFECT_FIELD_MAP[String(field || tr.field || '').toUpperCase()];
                if (f && scalar.length) tracks.push({ property: 'effect:' + idx + ':' + f, op, base: baseV, keys: scalar });
              }
            }
          }
        }
        continue;
      }
      const binding = anims[key];
      if (!binding || !binding.tracks) continue;
      for (const t of bindingToTracks(key, binding)) tracks.push(t);
    } catch (e) {}
  }
  return tracks;
}
function nodeTracks(node: any): any[] {
  lastReadFailed = false;
  let anims: any;
  try {
    anims = node.animations;
  } catch (e) {
    // Documented fallback: manualKeyframeTracks (a simpler serializer that sometimes survives
    // when `animations` throws). Some nodes — e.g. one with an animated "Water caustic"/glass/
    // noise shader whose base value type Figma's Beta API can't serialize ("Unsupported base
    // value type") — fail BOTH getters and are unreadable.
    try {
      const mkt = node.manualKeyframeTracks;
      if (mkt) {
        const recovered = manualTracksToOur(mkt);
        if (recovered.length) return recovered;
      }
    } catch (e2) {}
    console.warn('[m2c] could not read animations for', node.name, node.id, '-', String(e && (e as any).message ? (e as any).message : e));
    readSkips++;
    lastReadFailed = true;
    return [];
  }
  if (!anims) return [];
  return tracksFromAnims(anims);
}

// Raw (faithful) serialization of a node's Figma-side motion, for the "full export" view.
function rawNode(node: any): any {
  let anims: any = undefined;
  try { anims = node.animations ? JSON.parse(JSON.stringify(node.animations)) : undefined; } catch (e) {}
  let timelines: any = undefined;
  try { timelines = node.timelines ? node.timelines.map((t: Timeline) => ({ id: t.id, duration: t.duration })) : undefined; } catch (e) {}
  const out: any = {
    id: node.id, name: node.name, type: node.type,
    x: node.x, y: node.y, width: node.width, height: node.height,
    rotation: node.rotation, opacity: node.opacity,
  };
  if (anims && Object.keys(anims).length) out.animations = anims;
  if (timelines && timelines.length) out.timelines = timelines;
  if ('children' in node && node.children.length) out.children = node.children.map(rawNode);
  return out;
}

// ----------------------------------------------------------- build layer ---

const CONTAINER_TYPES = ['FRAME', 'GROUP', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE', 'SECTION'];

// Nodes whose exact appearance our CSS path can't reproduce — real vector shapes,
// polygons/stars, and shader/pattern/radial/image fills/effects. We rasterize these with
// Figma's own renderer (exportAsync -> PNG) so the appearance is pixel-exact; transforms
// still animate on top. Collected during the (sync) tree build, exported async afterwards.
let rasterList: Array<{ node: any; layer: any }> = [];

// Rasterize ONLY for a fill we can't reproduce in CSS (image / shader / pattern / radial).
// Geometry is emitted as base.shape (polygon/star/path) and effects as base.effects, so a
// vector shape or a drop-shadow no longer forces a PNG bake. When a shape DOES have a
// texture fill (e.g. the water-shader polygon) we still rasterize the texture, but keep
// base.shape so the engine clips the texture to the real outline.
function needsRaster(node: any): boolean {
  return hasTextureFill(node) || hasUnsupportedEffect(node);
}

// Export a node's texture for the engine. THE GOTCHA: a node that Motion animates to
// opacity/scale 0 at the timeline start (a fade/pop-in) renders INVISIBLE at rest, so a
// straight `exportAsync` returns a degenerate ~1×1 blank PNG (this blanked the water
// polygon). Fix: export a CLONE moved off-canvas (detached from the frame's Motion
// timeline) with opacity/visibility forced on, so we capture the node's true appearance.
async function exportClean(node: any): Promise<Uint8Array | null> {
  const opts = { format: 'PNG', constraint: { type: 'SCALE', value: 2 } } as any;
  let bytes: Uint8Array | null = null;
  if (typeof node.clone === 'function') {
    let clone: any = null;
    try {
      clone = node.clone();
      figma.currentPage.appendChild(clone);          // out of the animated frame -> Motion off
      try { clone.x = -100000; clone.y = -100000; } catch (e) {} // off-screen: no visible flicker
      try { clone.visible = true; } catch (e) {}
      try { clone.opacity = 1; } catch (e) {}
      try { clone.rotation = 0; } catch (e) {}
      bytes = await clone.exportAsync(opts);
    } catch (e) { bytes = null; }
    finally { if (clone) { try { clone.remove(); } catch (e) {} } }
  }
  // Fall back to (or improve on) a direct in-place export.
  if (!bytes || bytes.length < 200) {
    try {
      const direct = await node.exportAsync(opts);
      if (direct && (!bytes || direct.length > bytes.length)) bytes = direct;
    } catch (e) {}
  }
  return bytes;
}

async function rasterize(node: any, layer: any): Promise<void> {
  try {
    const bytes = await exportClean(node);
    if (!bytes || !bytes.length) return;             // nothing usable — keep native shape/fill
    layer.base.image = 'data:image/png;base64,' + figma.base64Encode(bytes);
    layer.base.fill = null;        // the PNG carries the real fill/shape/effects
    layer.base.rotation = 0;       // base rotation is baked into the export
    layer.base.cornerRadius = [0, 0, 0, 0];
    layer.base.effects = null;     // baked into the PNG — don't double-apply as box-shadow
    // keep base.shape: a polygon/star texture is clipped to its real outline by the engine;
    // appearance (fill/stroke) is baked into the PNG — drop those tracks, keep transforms
    if (layer.tracks) layer.tracks = layer.tracks.filter((t: any) => t.property !== 'fillColor' && t.property !== 'strokeWeight');
  } catch (e) {}
}

function nodeTypeToOur(node: any): string {
  if (node.type === 'TEXT') return 'text';
  if (node.type === 'ELLIPSE') return 'ellipse';
  if (node.type === 'GROUP' || node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') return 'group';
  if (node.type === 'VECTOR' || node.type === 'STAR' || node.type === 'POLYGON' || node.type === 'LINE' || node.type === 'BOOLEAN_OPERATION') return 'vector';
  return 'rect';
}

function buildText(node: any): any {
  const fill = firstVisiblePaint(node.fills);
  let color = '#111111FF';
  if (fill && fill.type === 'SOLID') color = rgbaToHex({ r: fill.color.r, g: fill.color.g, b: fill.color.b, a: fill.opacity == null ? 1 : fill.opacity });
  let fontFamily = 'Inter', fontWeight = 400;
  if (node.fontName && node.fontName !== figma.mixed) {
    fontFamily = node.fontName.family;
    const style = (node.fontName.style || '').toLowerCase();
    fontWeight = style.indexOf('bold') >= 0 ? 700 : style.indexOf('medium') >= 0 ? 500 : style.indexOf('semibold') >= 0 ? 600 : style.indexOf('light') >= 0 ? 300 : 400;
  }
  const fontSize = (node.fontSize && node.fontSize !== figma.mixed) ? node.fontSize : 16;
  let lineHeight = 1.2;
  if (node.lineHeight && node.lineHeight !== figma.mixed && node.lineHeight.unit === 'PERCENT') lineHeight = node.lineHeight.value / 100;
  let letterSpacing = 0;
  if (node.letterSpacing && node.letterSpacing !== figma.mixed && node.letterSpacing.unit === 'PIXELS') letterSpacing = node.letterSpacing.value;
  return {
    characters: node.characters || '', fontSize, fontFamily, fontWeight, color,
    lineHeight, letterSpacing, align: (node.textAlignHorizontal || 'LEFT').toLowerCase(),
  };
}

// Absolute (page-space) origin of a node. Figma GROUPs are coordinate-transparent — a
// node's x/y is relative to the nearest FRAME, not its immediate parent — so naive
// parent-relative nesting double-counts offsets. absoluteTransform gives one consistent
// space; we render each layer at (nodeAbs - parentAbs) so nesting stays correct.
function absPos(node: any): { x: number; y: number } {
  try {
    const m = node.absoluteTransform;
    if (m && m[0] && m[1]) return { x: m[0][2], y: m[1][2] };
  } catch (e) {}
  try {
    const bb = node.absoluteBoundingBox;
    if (bb) return { x: bb.x, y: bb.y };
  } catch (e) {}
  return { x: node.x || 0, y: node.y || 0 };
}

function buildLayer(node: any, parentAbsX: number, parentAbsY: number): any {
  const isContainer = CONTAINER_TYPES.indexOf(node.type) >= 0;
  const ap = absPos(node);
  const base: any = {
    x: Math.round(ap.x - parentAbsX), y: Math.round(ap.y - parentAbsY),
    width: Math.round(node.width || 0), height: Math.round(node.height || 0),
    opacity: node.opacity == null ? 1 : node.opacity,
    rotation: node.rotation ? -node.rotation : 0, // Figma CCW+ -> CSS CW+
    scaleX: 1, scaleY: 1,
    anchor: { x: 0.5, y: 0.5 },
    cornerRadius: cornerArray(node),
  };
  const ourType = nodeTypeToOur(node);
  if (node.type === 'TEXT') {
    base.text = buildText(node);
  } else {
    base.fill = paintToOur(firstVisiblePaint(node.fills));
    const stroke = firstVisiblePaint(node.strokes);
    if (stroke && stroke.type === 'SOLID' && node.strokeWeight && node.strokeWeight !== figma.mixed) {
      base.stroke = { color: rgbaToHex({ r: stroke.color.r, g: stroke.color.g, b: stroke.color.b, a: stroke.opacity == null ? 1 : stroke.opacity }), weight: node.strokeWeight };
    }
    // Per-side border weights (individual strokes) — set when the four sides differ.
    try {
      const t = node.strokeTopWeight, r = node.strokeRightWeight, btm = node.strokeBottomWeight, l = node.strokeLeftWeight;
      if ([t, r, btm, l].every((v) => typeof v === 'number') && !(t === r && r === btm && btm === l)) {
        base.borderWeights = [t, r, btm, l];
        if (!base.stroke && stroke && stroke.type === 'SOLID') {
          base.stroke = { color: rgbaToHex({ r: stroke.color.r, g: stroke.color.g, b: stroke.color.b, a: stroke.opacity == null ? 1 : stroke.opacity }), weight: Math.max(t, r, btm, l) };
        }
      }
    } catch (e) {}
    // Ellipse arc / pie / donut (arcData). Angles are radians in Figma.
    if (node.type === 'ELLIPSE') {
      try {
        const arc = node.arcData;
        if (arc && (Math.abs((arc.endingAngle - arc.startingAngle) - Math.PI * 2) > 1e-3 || (arc.innerRadius || 0) > 0)) {
          const toDeg = (rad: number) => Math.round((rad * 180) / Math.PI);
          base.shape = { kind: 'arc', startAngle: toDeg(arc.startingAngle), endAngle: toDeg(arc.endingAngle), innerRadius: arc.innerRadius || 0 };
        }
      } catch (e) {}
    }
    const fxList = effectsToOur(node);
    if (fxList.length) base.effects = fxList;
    // Polygon/star keep their shape even when rasterized (engine clips the texture to the
    // outline). A freeform path that must rasterize (gradient/image/shader fill) would
    // otherwise emit an empty/solid SVG path that hides the texture — so drop the path shape
    // for those and let the bbox raster show instead.
    const shp = shapeOf(node);
    if (shp && !(shp.kind === 'path' && needsRaster(node))) base.shape = shp;
    // A Figma shader/texture effect (e.g. "Water caustic", glass, noise) can't be expressed in
    // CSS, so we rasterize a snapshot (base.image). Flag it so the engine can ALSO render a live
    // animated approximation on top, masked to the node's exact shape by the snapshot's alpha —
    // this makes the water flow instead of being a frozen PNG.
    if (hasUnsupportedEffect(node)) base.shader = { kind: 'caustics' };
    // A procedural Figma fill (SHADER / NOISE / PATTERN, e.g. the "Water caustic" shader)
    // rasterizes to a FROZEN, shape-clipped snapshot — so a morphing/scaling polygon ends up a
    // static triangle. Flag ANY such fill (it may sit on top of a solid base fill, so scan all,
    // not just the first) so the engine renders a live animated caustics fill clipped to the
    // real, morphing shape instead of baking a PNG. Gradients/images raster fine, so skip those.
    if (!base.shader) {
      try {
        const fs = node.fills;
        if (fs && fs !== figma.mixed && Array.isArray(fs)) {
          for (const p of fs as Paint[]) {
            if (p && p.visible !== false &&
              (p.type === 'SHADER' || (p.type as string) === 'NOISE' || p.type === 'PATTERN')) {
              base.shader = { kind: 'caustics' };
              break;
            }
          }
        }
      } catch (e) { /* fills unreadable — leave as raster */ }
    }
  }
  if (isContainer) base.clip = !!node.clipsContent;
  // Layer blend mode (MULTIPLY / SCREEN / OVERLAY / …). PASS_THROUGH / NORMAL → normal.
  try { const bm = BLEND_MAP[node.blendMode]; if (bm) base.blendMode = bm; } catch (e) {}

  const tracks = nodeTracks(node);
  const layer: any = {
    id: node.id, name: node.name, type: ourType, base,
    tracks,
  };
  // Animation completely unreadable (Figma Beta limitation, e.g. an animated shader whose base
  // value type Figma can't serialize). We keep the node at its Figma resting state and flag it
  // so the UI can surface that this layer's motion couldn't be reproduced.
  if (lastReadFailed) layer.readFailed = true;
  if (node.isMask) layer.isMask = true; // Figma mask: reveals its sibling layers through its shape
  // Shader fills are rendered live by the engine — don't bake a (frozen, shape-clipped) PNG.
  if (!isContainer && needsRaster(node) && !base.shader) rasterList.push({ node, layer });
  if (isContainer && node.children && node.children.length) {
    layer.children = node.children.filter((c: any) => c.visible !== false).map((c: any) => buildLayer(c, ap.x, ap.y));
  }
  return layer;
}

// --------------------------------------------------------------- export ---

function timelineDuration(node: any): number {
  try {
    if (node.timelines && node.timelines.length) return node.timelines[0].duration || 0;
  } catch (e) {}
  return 0;
}

// Each KeyframeBinding carries the timeline duration; read it off the subtree as a
// reliable fallback when node.timelines reports 0.
function scanBindingDuration(node: any): number {
  let m = 0;
  const visit = (n: any) => {
    let a: any;
    try { a = n.animations; } catch (e) { a = null; }
    if (a) {
      try {
        for (const k of Object.keys(a)) {
          const b = a[k];
          if (b && typeof b.timelineDuration === 'number' && b.timelineDuration > m) m = b.timelineDuration;
        }
      } catch (e) {}
    }
    if (n.children) for (const c of n.children) { try { visit(c); } catch (e) {} }
  };
  try { visit(node); } catch (e) {}
  return m;
}

// Largest keyframe time across all tracks — used to recover duration when the
// timeline reports 0 (Figma often leaves the duration implicit on the keyframes).
function maxKeyTime(layers: any[]): number {
  let m = 0;
  const walk = (ls: any[]) => {
    for (const l of ls) {
      for (const tr of l.tracks || []) for (const k of tr.keys || []) if (k.t > m) m = k.t;
      if (l.children) walk(l.children);
    }
  };
  walk(layers);
  return m;
}

function buildMotionDoc(root: any): any {
  const isLeaf = !(root.children && root.children.length);
  const fill = root.type !== 'TEXT' ? paintToOur(firstVisiblePaint(root.fills)) : null;
  const rootAbs = absPos(root);

  let layers: any[];
  if (isLeaf) {
    // The selected node is both the stage and the only layer — anchor it at the origin.
    const l = buildLayer(root, rootAbs.x, rootAbs.y);
    l.base.x = 0; l.base.y = 0;
    delete l.children;
    layers = [l];
  } else {
    // The frame is the stage; children are positioned relative to the frame's origin.
    layers = root.children.filter((c: any) => c.visible !== false).map((c: any) => buildLayer(c, rootAbs.x, rootAbs.y));
    // The frame itself may be animated (e.g. animated fills) — keep it as a full-size
    // background layer so its own motion isn't lost.
    const rootTracks = nodeTracks(root);
    if (rootTracks.length) {
      layers.unshift({
        id: root.id + ':bg', name: root.name + ' (bg)', type: 'rect',
        base: {
          x: 0, y: 0, width: Math.round(root.width || 0), height: Math.round(root.height || 0),
          opacity: root.opacity == null ? 1 : root.opacity, rotation: 0, scaleX: 1, scaleY: 1,
          anchor: { x: 0.5, y: 0.5 }, cornerRadius: cornerArray(root), fill,
          clip: !!root.clipsContent,
        },
        tracks: rootTracks,
      });
    }
  }

  let duration = Math.max(timelineDuration(root), scanBindingDuration(root), maxKeyTime(layers));
  if (!(duration > 0)) duration = 1;

  // Leaf fills the whole stage -> transparent stage so its movement shows on the checkerboard.
  const background = isLeaf ? '#00000000' : (fill && fill.type === 'solid' ? fill.color : '#FFFFFFFF');

  return {
    format: 'motion-engine',
    version: '1.0',
    meta: { name: root.name, source: 'figma', figmaNodeId: root.id },
    duration,
    fps: 60,
    stage: { width: Math.round(root.width || 300), height: Math.round(root.height || 300), background },
    layers,
  };
}

// Climb to the top-level node (the frame that owns the Motion timeline) so we export
// the whole scene as the stage, not just a nested element.
function findRoot(node: any): any {
  let r = node;
  try { while (r.parent && r.parent.type !== 'PAGE' && r.parent.type !== 'DOCUMENT') r = r.parent; } catch (e) {}
  return r;
}

async function exportSelection() {
  const sel = figma.currentPage.selection;
  if (!sel.length) {
    figma.ui.postMessage({ type: 'empty', reason: 'Select an animated frame (one with a Motion timeline).' });
    return;
  }
  const root: any = findRoot(sel[0]);

  try {
    readSkips = 0;
    rasterList = [];
    const doc = buildMotionDoc(root);
    // rasterize vector/polygon/shader/effect nodes to PNG for pixel-exact appearance
    if (rasterList.length) await Promise.all(rasterList.map((r) => rasterize(r.node, r.layer)));
    const raw = { figmaNodeId: root.id, name: root.name, duration: timelineDuration(root), tree: rawNode(root) };
    let trackCount = 0;
    const count = (ls: any[]) => { for (const l of ls) { trackCount += (l.tracks || []).length; if (l.children) count(l.children); } };
    count(doc.layers);
    const notice = readSkips > 0
      ? readSkips + ' layer' + (readSkips > 1 ? 's' : '') + ' skipped (Figma Beta couldn’t read their animations)'
      : '';
    figma.ui.postMessage({ type: 'export', doc, raw, hasMotion: trackCount > 0, notice });
  } catch (e: any) {
    figma.ui.postMessage({ type: 'error', message: String(e && e.message ? e.message : e) });
  }
}

// Build a sample animated frame IN THE FIGMA DOCUMENT using the Motion *write* API,
// so the plugin is self-contained to test even without a hand-made Motion animation.
function createDemo() {
  try {
    const frame = figma.createFrame();
    frame.name = 'Motion Demo';
    frame.resize(375, 300);
    frame.x = Math.round(figma.viewport.center.x - 188);
    frame.y = Math.round(figma.viewport.center.y - 150);
    frame.fills = [{ type: 'SOLID', color: { r: 0.05, g: 0.06, b: 0.09 } }];
    frame.clipsContent = true;
    figma.currentPage.appendChild(frame);

    const card = figma.createRectangle();
    card.name = 'Card';
    card.resize(220, 130);
    card.x = 78; card.y = 85;
    card.cornerRadius = 20;
    card.fills = [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96 } }];
    frame.appendChild(card);

    const badge = figma.createEllipse();
    badge.name = 'Badge';
    badge.resize(44, 44);
    badge.x = 94; badge.y = 101;
    badge.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.8, b: 0.08 } }];
    frame.appendChild(badge);

    let applied = 0;
    const tryApply = (fn: () => void) => { try { fn(); applied++; } catch (e) {} };

    // set the timeline duration (timeline belongs to the top-level frame)
    tryApply(() => {
      const tls = (card as any).timelines;
      if (tls && tls.length) (card as any).setTimelineDuration(tls[0].id, 1.4);
    });

    tryApply(() => (card as any).applyManualKeyframeTrack(
      { type: 'PROPERTY', name: 'TRANSLATION_Y' },
      { baseValue: { type: 'FLOAT', value: 0 }, keyframes: [
        { timelinePosition: 0, value: { type: 'FLOAT', value: 90 }, easing: { type: 'GENTLE' } },
        { timelinePosition: 0.6, value: { type: 'FLOAT', value: 0 } },
      ] }));

    tryApply(() => (card as any).applyManualKeyframeTrack(
      { type: 'PROPERTY', name: 'OPACITY' },
      { baseValue: { type: 'FLOAT', value: 1 }, keyframes: [
        { timelinePosition: 0, value: { type: 'FLOAT', value: 0 }, easing: { type: 'EASE_OUT' } },
        { timelinePosition: 0.4, value: { type: 'FLOAT', value: 1 } },
      ] }));

    tryApply(() => (card as any).applyManualKeyframeTrack(
      { type: 'PROPERTY', name: 'SCALE_XY' },
      { baseValue: { type: 'VECTOR', value: { x: 1, y: 1 } }, keyframes: [
        { timelinePosition: 0, value: { type: 'VECTOR', value: { x: 0.7, y: 0.7 } }, easing: { type: 'BOUNCY' } },
        { timelinePosition: 0.7, value: { type: 'VECTOR', value: { x: 1, y: 1 } } },
      ] }));

    tryApply(() => (badge as any).applyManualKeyframeTrack(
      { type: 'PROPERTY', name: 'ROTATION' },
      { baseValue: { type: 'FLOAT', value: 0 }, keyframes: [
        { timelinePosition: 0.3, value: { type: 'FLOAT', value: 0 }, easing: { type: 'EASE_IN_AND_OUT' } },
        { timelinePosition: 1.4, value: { type: 'FLOAT', value: 360 } },
      ] }));

    figma.currentPage.selection = [frame];
    figma.viewport.scrollAndZoomIntoView([frame]);
    figma.notify(applied > 0
      ? 'Demo created — applied ' + applied + ' Motion track(s). Exported below.'
      : 'Created the frame, but the Motion write API did not apply (Beta). Try animating it manually.');
    exportSelection();
  } catch (e: any) {
    figma.ui.postMessage({ type: 'error', message: 'createDemo failed: ' + String(e && e.message ? e.message : e) });
  }
}

figma.on('selectionchange', exportSelection);

figma.ui.onmessage = (msg: any) => {
  if (!msg) return;
  if (msg.type === 'ready' || msg.type === 'reexport') exportSelection();
  else if (msg.type === 'createDemo') createDemo();
  else if (msg.type === 'resize') figma.ui.resize(Math.max(560, msg.width | 0), Math.max(400, msg.height | 0));
  else if (msg.type === 'close') figma.closePlugin();
  else if (msg.type === 'notify') figma.notify(msg.message || '');
};

exportSelection();
