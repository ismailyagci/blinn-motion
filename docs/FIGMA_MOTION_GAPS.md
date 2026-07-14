# Figma Motion → Blinn Motion — feature gap analysis

What Figma's Motion API can express vs. what Blinn Motion currently converts (`code.ts`) and
renders (`@blinn-motion/core` + adapters). Source of truth: `@figma/plugin-typings`
(`KeyframePropertyFieldName`, `EffectKeyframeFieldName`, `KeyframeValue`, `MotionEasing`,
`Effect`, `Paint`, `BlendMode`).

Legend: ✅ supported · ⚠️ partial/approximate · ❌ missing

---

## ✅ Implemented in the "add everything" pass (2026-06-28)

Across `@blinn-motion/core`, `@blinn-motion/dom`, `@blinn-motion/canvas`, `@blinn-motion/react-native` and the
converter (`code.ts`):

- **PATH_TRIM** rendering — DOM via `stroke-dasharray/offset`; canvas via pure-JS path
  flatten (+ optional SVG getPointAtLength).
- **Radial / angular (conic) / diamond gradients** — static + animated stops, with
  center/radius/angle. (diamond ≈ radial.)
- **Animated gradient stops** — `fillStop:<i>:color|pos` tracks (COLOR_POINT conversion).
- **Stroke color animation** — `strokeColor` track; converter reads the `strokes` collection.
- **Per-side border weights** — `borderTop/Right/Bottom/LeftWeight` (static + animated).
- **Animated effects** — `effect:<i>:offsetX|offsetY|radius|spread|color` tracks (animated
  shadows etc.).
- **Effect types** GLASS (frosted backdrop), NOISE & TEXTURE (procedural overlay).
- **Blend modes** — `mix-blend-mode` (DOM) / `globalCompositeOperation` (canvas).
- **Ellipse arc / pie / donut** — `arcData` → arc shape, clipped via polygon vertices.
- **Physical spring** — proper underdamped oscillator (ζ = 1 − bounce).
- **Auto-layout / grid** props (`STACK_*`, `GRID_*`) — mapped & data-preserved (reflow TODO).

Still out of scope (architecturally separate): Prototype Smart Animate, interactive
components, variable bindings, video paint, text typewriter/path. The detailed analysis
below is kept for reference (items above are now ✅/⚠️).

---

## 0. Already solved / supported (for context)

- Transforms: `TRANSLATION_X/Y/XY`, `ROTATION` (with Figma CCW→CSS CW fix), `SCALE_X/Y/XY` ✅
- `OPACITY`, `WIDTH`, `HEIGHT` ✅
- Corner radius: `CORNER_RADIUS` + all four `RECTANGLE_*_CORNER_RADIUS` ✅
- `STROKE_WEIGHT` ✅ · `POLYGON_COUNT` (n‑gon/star morph) ✅
- Easing: every `MotionEasing` type — `LINEAR/HOLD`, `EASE_*`, `EASE_*_BACK`,
  `GENTLE/QUICK/BOUNCY/SLOW`, `CUSTOM_CUBIC_BEZIER`, `CUSTOM_SPRING` ✅
- Keyframe ops `SET/OFFSET/SCALE`, stacked tracks per property ✅
- Fill color animation (`fills[i]` COLOR → `fillColor`) ✅
- Static: solid + **linear** gradient, drop/inner shadow, layer/bg blur, vector paths +
  arrowheads, polygon/star, basic masks, and a procedural **caustics shader** approximation ✅

---

## A. Animatable properties Figma exposes but we DON'T map

(from `KeyframePropertyFieldName` — these never become tracks)

- **Auto-layout**: `STACK_SPACING` (gap), `STACK_PADDING_LEFT/TOP/RIGHT/BOTTOM`,
  `STACK_COUNTER_SPACING` ❌ — animated auto-layout reflow is lost
- **Grid layout**: `GRID_ROW_GAP`, `GRID_COLUMN_GAP` ❌
- **Per-side border weight**: `BORDER_TOP/BOTTOM/LEFT/RIGHT_WEIGHT` ❌ — we only do a
  single uniform `strokeWeight`

## B. Properties we MAP but never RENDER (looks supported, isn't)

- **`PATH_TRIM_START` / `PATH_TRIM_END`** ✅ — sampled + rendered (DOM dasharray; canvas
  pure-JS path slice).

## C. Effect-property animation — entirely missing

Figma animates effect sub-fields (`EffectKeyframeFieldName`); we read effects as **static
only** and the `effects` keyframe collection is skipped in `code.ts`:

- Shadows: `OFFSET_X/Y`, `RADIUS`, `SPREAD`, `COLOR` ❌ (no animated shadows)
- Glass/refraction: `REFRACTION_RADIUS`, `SPECULAR_ANGLE`, `SPECULAR_INTENSITY`,
  `CHROMATIC_ABERRATION`, `SPLAY`, `REFRACTION_INTENSITY`, `START_RADIUS` ❌
- Noise: `NOISE_SIZE_X/Y`, `DENSITY` ❌
- `EFFECT_OPACITY`, `SECONDARY_COLOR` ❌

## D. Effect TYPES missing (even static)

- **`GLASS`** (new glass/liquid effect) ❌ — dropped or rasterized
- **`NOISE`** effect ❌ · **`TEXTURE`** effect ❌
- **Progressive / variable blur** ⚠️ — only uniform CSS blur (and halved)
- Supported as static CSS: `DROP_SHADOW`, `INNER_SHADOW`, `LAYER_BLUR`, `BACKGROUND_BLUR`

## E. Paint types missing / limited

- **`GRADIENT_RADIAL`**, **`GRADIENT_ANGULAR`** (conic), **`GRADIENT_DIAMOND`** ❌ — only
  `GRADIENT_LINEAR` is native; the rest rasterize to a static PNG and can't animate
- **`PATTERN`** ❌ · **`SHADER`** ⚠️ (only the one "caustics" approximation; other
  shaders render wrong) · **`NOISE`** paint ❌ · **`VIDEO`** paint ❌
- **`IMAGE`** ⚠️ — static raster snapshot only (no live, no object-fit variants)
- **Gradient stop / handle animation** ❌ — keyframe value types `COLOR_POINT`
  (stop pos+color), `CIRCLE_POINT`, `LINE` are dropped by `convValue` (returns null), so
  animating gradient colors, positions, or direction is lost

## F. Color / stroke animation gaps

- **Stroke color animation** ❌ — `code.ts` only emits a `fillColor` track for the
  `fills` collection; `strokes` (and `effects`) color tracks are skipped
- Multi-fill: only the **first** visible fill is used; per-fill animation beyond it ❌

## G. Rendering-model gaps

- **Blend modes** ❌ — `MULTIPLY/SCREEN/OVERLAY/…` all render as NORMAL (no
  `mix-blend-mode` / canvas `globalCompositeOperation`)
- **Masks** ⚠️ — only rectangular-reveal + basic shape clip; alpha / luminance / vector
  masks are approximate
- **Rotated PARENT compensation** ❌ — animated child coords aren't corrected for a
  rotated parent (base rotation 0 is the tested case)
- **Transform pivot/anchor** ⚠️ — defaults to `{0.5,0.5}`; Figma's actual transform origin
  isn't read, so off-center scale/rotate pivots can differ
- **Spring fidelity** ⚠️ — perceptual `bounce` approximation, not Figma's physical
  re-solve (`mass/stiffness/damping/initialVelocity`)
- **Ellipse arc/sweep** (`arcData`: start/end angle, inner radius — pie/donut) ❌ — drawn
  as a full ellipse

## H. Out-of-scope-of-the-timeline (broader Figma motion)

- **Prototype "Smart Animate"** transitions between frames/variants ❌ — we only read the
  in-frame Motion timeline, not prototype reactions
- **Interactive components / variant state changes** ❌
- **Variable bindings** driving animated values ❌
- **Text motion**: typewriter / per-character / text-on-path ❌

---

## Suggested priority (visual impact ÷ effort)

1. **Auto-layout (`STACK_*`) animation** — needed for real UI motion ★
2. **Radial / angular gradients** (static + animated) — very common fills ★
3. **Animated shadows** (`OFFSET/RADIUS/COLOR`) — common, maps cleanly to CSS/canvas ★
4. **Stroke color animation** — small converter fix
5. **Blend modes** — cheap in DOM/canvas, big fidelity win
6. Glass / noise / texture effects, gradient-stop animation, real masks — larger efforts
7. ~~**`PATH_TRIM`** rendering~~ — ✅ DOM + canvas
