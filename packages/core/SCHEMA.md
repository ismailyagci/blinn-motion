# MotionDoc — our engine format (v1.0)

A Lottie-like, but **own**, animation document. It is produced by the Figma plugin
(converting Figma Motion → MotionDoc) and consumed by `motion-engine.js`, a pure
HTML/CSS/JS player. The format is intentionally small, time-based (seconds), and
renderer-agnostic.

> Design goal: anything our `motion-engine.js` can play, the Figma converter can
> emit, and the format is human-readable & hand-authorable for tests.

---

## Top level

```jsonc
{
  "format": "motion-engine",
  "version": "1.0",
  "meta":   { "name": "Card intro", "source": "figma", "figmaNodeId": "12:34" },
  "duration": 1.2,                      // timeline length, SECONDS
  "fps": 60,                            // suggested sampling fps (engine is time-based)
  "stage":  { "width": 375, "height": 812, "background": "#FFFFFFFF" },
  "layers": [ /* Layer, back-to-front paint order */ ]
}
```

## Layer

Layers nest: a layer's `base` position is **relative to its parent layer's box**
(top-level layers are relative to the stage). Children inherit the parent's animated
transform — exactly like Lottie / DOM. This is why we nest instead of flattening.

```jsonc
{
  "id": "12:40",
  "name": "Card",
  "type": "rect",                       // rect | ellipse | text | image | vector | group
  "children": [ /* nested Layer[] */ ],
  "base": {
    "x": 24, "y": 120,                  // top-left, relative to parent
    "width": 327, "height": 200,
    "opacity": 1,
    "rotation": 0,                      // degrees
    "scaleX": 1, "scaleY": 1,
    "anchor": { "x": 0.5, "y": 0.5 },   // transform-origin, 0..1 of the box
    "cornerRadius": [12, 12, 12, 12],   // [tl, tr, br, bl]
    "fill":   { "type": "solid", "color": "#2D6CFFFF" },
    "stroke": { "color": "#00000022", "weight": 1 } | null,
    "text":   null,                     // or Text (see below) for type:"text"
    "image":  null,                     // data-URL texture (rasterized shader/photo fill)
    "shape":  null,                     // Shape geometry (see below) — native, not pixels
    "effects":[ /* Effect[] */ ],       // shadows / blur (see below)
    "clip":   true                      // clip children to box
  },
  "tracks": [ /* Track[] */ ]
}
```

### Shape (`shape`) — native geometry, rendered without rasterizing
```jsonc
{ "kind": "polygon", "points": 3 }                 // regular n-gon via clip-path; POLYGON_COUNT can morph `points`
{ "kind": "star", "points": 5, "ratio": 0.4 }      // n-point star (inner/outer radius ratio)
{ "kind": "path", "vw": 780, "vh": 0,              // SVG path(s) in the node's local px space
  "paths": [ { "d": "M0 0 L760 0", "fill": null,
               "stroke": "#FF0000FF", "strokeWidth": 2,
               "cap": "round", "markerEnd": "arrow" } ] }
```
- `polygon`/`star` may also carry an `image` texture — the engine clips it to the outline.
- A `path` whose `markerEnd`/`markerStart` is `"arrow"` gets an SVG arrowhead that scales
  with the stroke (Figma arrow caps). `STROKE_WEIGHT` animates the stroke live.
- `POLYGON_COUNT` → a `polygonCount` track re-derives the clip-path each frame (smooth morph).

### Effect (`effects[]`)
```jsonc
{ "type": "drop",  "x": 0, "y": 16, "radius": 34, "spread": 0, "color": "#0000002E" }  // box-shadow
{ "type": "inner", "x": 0, "y": 2,  "radius": 8,  "spread": 0, "color": "#00000040" }  // inset box-shadow
{ "type": "blur",  "radius": 12 }                                                      // filter: blur
{ "type": "bgblur","radius": 12 }                                                      // backdrop-filter: blur
```
Emitting effects/shape as **data** (not a baked PNG) is what fixed entrance animations:
a scale-0 or 0-height node used to `exportAsync` to a degenerate 1×1 / wrong-scale snapshot.

### Paint (`fill`)
```jsonc
{ "type": "solid",  "color": "#RRGGBBAA" }
{ "type": "linear", "angle": 90, "stops": [ {"pos":0,"color":"#.."}, {"pos":1,"color":"#.."} ] }
{ "type": "image",  "src": "data:image/png;base64,…", "fit": "cover" }
```

### Text
```jsonc
{ "characters":"Hello", "fontSize":16, "fontFamily":"Inter", "fontWeight":600,
  "color":"#111111FF", "lineHeight":1.3, "letterSpacing":0, "align":"left" }
```

## Track — one animated property

```jsonc
{
  "property": "translateX",            // normalized name, see table
  "op":  "set" | "offset" | "scale",   // how value combines with the base value
  "unit":"px" | "deg" | "ratio" | "none",
  "base": 0,                           // base value the op combines against
  "keys": [ /* Keyframe[] */ ]
}
```

`op` resolution (per keyframe value `v`):
- `set`    → `v`               (absolute)
- `offset` → `base + v`        (delta)
- `scale`  → `base * v`        (multiplier)

Transform properties (`translateX/Y`, `rotation`, `scaleX/Y`) are applied via CSS
`transform` on top of the layer box, so their natural base is `0` (translate/rotate)
or `1` (scale). Style properties (`opacity`, `width`, `height`, `cornerRadius*`,
`strokeWeight`, `fillColor`) override the box.

## Keyframe

```jsonc
{
  "t": 0.0,                            // ABSOLUTE time on the timeline, seconds
  "v": 120,                            // number | [x,y] | "#RRGGBBAA" | bool | string
  "easing": { "type":"cubicBezier", "p":[0.42,0,0.58,1] }
}
```

**Segment convention:** a keyframe's `easing` governs interpolation **from this
keyframe to the next** (out-interpolation, like CSS `transition-timing-function`).
The last keyframe's easing is ignored. Before the first key the value is held; after
the last key the value is held.

### Easing (the only 4 shapes the engine understands)
```jsonc
{ "type": "linear" }
{ "type": "hold" }                                  // step: keep value until next key
{ "type": "cubicBezier", "p": [x1,y1,x2,y2] }       // y may exceed 0..1 (overshoot/back)
{ "type": "spring", "bounce": 0.3 }                 // 0=no overshoot … 1=very bouncy
```
The converter resolves every Figma easing preset to one of these (mostly
`cubicBezier`; Figma's GENTLE/QUICK/BOUNCY/SLOW → `spring`).

---

## Figma Motion → MotionDoc mapping

### Property names (`KeyframePropertyFieldName` → `property`)
| Figma | ours | unit | applied as |
|---|---|---|---|
| `TRANSLATION_X` | `translateX` | px | transform |
| `TRANSLATION_Y` | `translateY` | px | transform |
| `TRANSLATION_XY` | `translateXY` (`[x,y]`) | px | transform |
| `ROTATION` | `rotation` | deg | transform |
| `SCALE_X` | `scaleX` | ratio | transform |
| `SCALE_Y` | `scaleY` | ratio | transform |
| `SCALE_XY` | `scaleXY` (`[x,y]`) | ratio | transform |
| `OPACITY` | `opacity` | none | style |
| `WIDTH` / `HEIGHT` | `width` / `height` | px | style |
| `*_CORNER_RADIUS` | `cornerRadiusTL/TR/BL/BR` | px | style |
| `STROKE_WEIGHT` | `strokeWeight` | px | style (SVG stroke-width for paths) |
| `POLYGON_COUNT` | `polygonCount` | none | style (re-derives polygon/star clip-path) |
| `PATH_TRIM_START/END` | `trimStart` / `trimEnd` | ratio | style |
| `fills[i]` COLOR | `fillColor` | none | style |

### Value mapping (`KeyframeValue.type` → `v`)
| Figma | ours |
|---|---|
| `FLOAT` | `number` |
| `VECTOR` | `[x, y]` |
| `COLOR` (RGBA 0..1) | `"#RRGGBBAA"` |
| `BOOL` | `boolean` |
| `TEXT_DATA` | `string` |

### Easing mapping (`MotionEasing.type` → easing)
| Figma | ours |
|---|---|
| `LINEAR` | `linear` |
| `HOLD` | `hold` |
| `EASE_IN` | cubicBezier `[0.41,0,1,1]` |
| `EASE_OUT` | cubicBezier `[0,0,0.59,1]` |
| `EASE_IN_AND_OUT` | cubicBezier `[0.41,0,0.59,1]` |
| `EASE_IN_BACK` | cubicBezier `[0.36,0,0.66,-0.56]` |
| `EASE_OUT_BACK` | cubicBezier `[0.34,1.56,0.64,1]` |
| `EASE_IN_AND_OUT_BACK` | cubicBezier `[0.68,-0.6,0.32,1.6]` |
| `CUSTOM_CUBIC_BEZIER` | cubicBezier from `{x1,y1,x2,y2}` |
| `CUSTOM_SPRING` | spring `{bounce}` from `NormalizedSpring` |
| `GENTLE` / `QUICK` / `BOUNCY` / `SLOW` | spring `{bounce: 0.2/0.1/0.6/0.05}` (approx) |

`op` comes from `ManualKeyframeTrack.keyframeOperation` (`SET`/`OFFSET`/`SCALE`).
`base` comes from `KeyframeBinding.baseValue`. Timeline duration comes from
`node.timelines[0].duration`.
