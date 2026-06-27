# motion-to-code

Export a **Figma Motion** animation as JSON (not an image), convert it into our **own**
engine format (`MotionDoc`), and play it with a tiny vanilla **HTML/CSS/JS engine**.

Think *Lottie*, but not Lottie — our own document format and our own runtime, fed
directly from Figma's new Motion timeline via the Plugin API.

```
Figma Motion (node.animations / node.timelines)
        │   read keyframes, easing, springs — raw data, no rasterization
        ▼
   code.ts  ──►  raw Figma JSON   (faithful dump, "full export")
        │   convert
        ▼
   MotionDoc JSON   (our format, engine/SCHEMA.md)
        │   play
        ▼
   motion-engine.js  ──►  DOM + CSS transforms, rAF, keyframe interpolation
```

## Why this is possible

Figma Motion (Config 2026) exposes animations **programmatically** through the Plugin
API (`@figma/plugin-typings` ≥ 1.130, `MotionNodeMixin`):

| API | gives us |
| --- | --- |
| `node.animations` | every keyframe (styles + manual), per property: `{ baseValue, timelineDuration, tracks[] }` |
| `node.manualKeyframeTracks` | only the manual tracks |
| `node.timelines` | the frame's timeline `{ id, duration }` (seconds) |
| `ManualKeyframe` | `{ timelinePosition, easing, value }` |
| `MotionEasing` | presets + `CUSTOM_CUBIC_BEZIER {x1,y1,x2,y2}` + `CUSTOM_SPRING {bounce}` |

So we read structured motion (positions, scale, rotation, opacity, color, corner radius,
easing/spring) — not pixels. Figma's own Lottie export is "planned for later"; this is
our own pipeline that doesn't wait for it.

## Layout

```
code.ts                 Figma plugin main thread: read selection → raw + MotionDoc → UI
ui.template.html        Plugin UI (preview + JSON tabs + download). Engine inlined at build.
build.js                Inlines engine → ui.html; inlines sample → engine/player.html
manifest.json           Figma plugin manifest

engine/
  motion-engine.js      The runtime. Pure sample(doc,t) + DOM Player. No deps.
  SCHEMA.md             MotionDoc format spec + full Figma→MotionDoc mapping table
  player.html           Standalone player — open in a browser, paste/drop any MotionDoc
  test.js               Headless engine tests (easing, springs, color, interpolation)
  test-converter.js     End-to-end: mock Figma node → code.js → MotionDoc → engine

examples/
  sample.motion.json    Hand-authored MotionDoc (nested card + badge + text)
```

## Build & test

```bash
npm install
npm run build      # tsc -> code.js, then build.js -> ui.html + player.html
npm test           # engine unit tests
node engine/test-converter.js   # end-to-end converter test
```

## Use the plugin

1. `npm run build`
2. Figma → Plugins → Development → **Import plugin from manifest…** → pick `manifest.json`
3. Select an animated frame (one with a Motion timeline) and run the plugin.
4. The left pane previews it **with our engine**; the right pane shows the **MotionDoc**
   and the **Figma raw** JSON. Hit **Download .json**.

The downloaded `*.doc.json` plays anywhere with `motion-engine.js`:

```html
<div id="stage"></div>
<script src="motion-engine.js"></script>
<script>
  fetch('card.doc.json').then(r => r.json()).then(doc => {
    const player = MotionEngine.create(document.getElementById('stage'), doc, { loop: true });
    player.play();           // also: pause(), seek(seconds), seekFraction(0..1), toggle()
  });
</script>
```

## The engine in one paragraph

`motion-engine.js` is time-based (seconds). Each layer is an absolutely-positioned `div`;
children nest inside parents so transforms inherit (like Lottie). Per frame it samples
each track at the current time: find the active keyframe segment, map local progress
through the easing (`linear` / `hold` / `cubicBezier` solved with Newton-Raphson + bisection
/ `spring` damped approximation), interpolate the value (number / `[x,y]` / `#RRGGBBAA`
color), combine with the base via `op` (`set` / `offset` / `scale`), then write CSS
`transform` / `opacity` / box styles. The maths is DOM-free and unit-tested; only
`mount()` touches the DOM.

See **`engine/SCHEMA.md`** for the format and the complete Figma→MotionDoc mapping.

## v1 limitations (documented, not hidden)

- Image fills export as a placeholder color (image bytes need async `exportAsync`).
- Vector path morphing / `PATH_TRIM` render as no-ops on `<div>` layers (need SVG/Canvas).
- Spring easing is a perceptual approximation of Figma's normalized `bounce`, not a
  physical re-solve.
- One track per property is the well-tested path; stacked tracks on the same property are
  emitted but applied last-wins.
- Rotated **parent** frames aren't compensated in child coordinates (base rotation 0 is the
  tested case; animated rotation is fine).
