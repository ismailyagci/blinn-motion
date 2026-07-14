# @blinn-motion/site

The marketing landing page for **Blinn Motion** — *the runtime for Figma Motion* — built with [Astro](https://astro.build).

It's intentionally a **standalone** project (its own `node_modules`, **not** part of the
root npm workspaces) so the heavy Astro/Vite dependency tree never interferes with building
and testing the library packages.

## The fun part: it runs a real engine

The hero isn't a video or a GIF — it's a tiny, ~250-line **MotionDoc runtime**
(`src/scripts/blinn-motion-mini.ts`) playing the actual `card` document
(`src/data/card.ts`, the same fixture the library's tests use). It demonstrates the very
idea the page describes: a pure, DOM-free `sample(doc, t)` render method (with
`linear` / `hold` / `cubicBezier` Newton-Raphson / damped-`spring` easing) plus a thin DOM
adapter that paints the resolved tree. Play, pause, scrub and change speed are all wired to it.

> Note: `blinn-motion-mini` is a self-contained teaching copy for the landing page, not the real
> `@blinn-motion/core`. It exists so the site has zero build coupling to the library packages.

## Develop

```bash
npm install        # once
npm run dev        # http://localhost:4321
npm run build      # static output → dist/
npm run preview    # serve the built dist/
```

## Deploy

Production: **https://blinnmotion.com** (Cloudflare Pages via GitHub Actions).

See **[DEPLOY.md](./DEPLOY.md)** for API tokens, GitHub secrets, and custom-domain DNS.

## Structure

```
src/
  layouts/Base.astro        <head>, fonts, scroll-reveal + pointer-glow
  pages/index.astro         section assembly
  components/
    Nav.astro               sticky blurred nav + mobile menu
    Hero.astro              headline + live StageDemo
    StageDemo.astro         the live MotionDoc player + controls
    Pipeline.astro          Figma Motion → plugin → core → adapters
    Adapters.astro          DOM / Canvas / React / React Native
    RenderMethod.astro      sample(doc, t) explainer
    Features.astro          feature grid
    Usage.astro             tabbed code examples
    Comparison.astro        workflow: hand CSS · video · Blinn
    CTA.astro · Footer.astro
  scripts/blinn-motion-mini.ts    compact pure-JS sampler + DOM adapter
  data/card.ts              the card MotionDoc
  data/site.ts              shared links/copy
  styles/global.css         design system (tokens, buttons, cards, reveal)
```

Design language: **flat "motion editor on paper."** White canvas, flat saturated accents that
each own a concept (DOM `#2F6BFF`, Canvas `#07C0DC`, React `#7A5CFF`, Native `#FF6585`), and crisp
ink type — **Space Grotesk** (display) · **Inter** (body) · **JetBrains Mono** (timecodes & data).
The signature is a **keyframe timeline** — a hairline track with rotated-square diamonds at the
card's real keyframe times and a moving playhead — which recurs as the hero scrubber, the section
eyebrows, and the CTA rule. No glows, no glassmorphism, no gradients.
