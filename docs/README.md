# @blinn-motion/docs

The Blinn Motion documentation site, built with [Mintlify](https://mintlify.com) (MDX + `docs.json`).

It's a **standalone** app (its own `node_modules`, not part of the root npm workspaces), like
`site/`. Content is grounded in the real engine — the [MotionDoc schema](reference/) mirrors
`packages/core/SCHEMA.md`, and the API pages mirror the actual `@blinn-motion/*` exports.

## Develop

```bash
npm install        # once (installs the mintlify CLI)
npm run dev        # http://localhost:3000
```

Other scripts: `npm run broken-links` (check internal links), `npm run upgrade` (update the CLI).

## Deploy

Production: **https://docs.blinnmotion.com**  
(`mint export` → static zip → Cloudflare Pages project `blinn-motion-docs`)

See **[DEPLOY.md](./DEPLOY.md)** for secrets, first deploy, and custom domain.

## Structure

```
docs.json                 theme, colors, fonts, navigation, navbar/footer
favicon.svg · logo/       brand assets (flat blinn-motion mark)
index.mdx                 Introduction
quickstart.mdx            install → MotionDoc → play
concepts/
  motiondoc.mdx           the format, by example
  render-engine.mdx       sample(doc, t), composition, the Ticker
  easing.mdx              the four easing shapes + Figma mapping
adapters/
  overview.mdx            one tree, four painters + fidelity matrix
  dom · canvas · react · react-native
guides/
  figma-plugin.mdx        export from Figma
  playback.mdx            play/pause/seek/loop/speed/scrubber
reference/
  motiondoc-schema.mdx    every field (mirrors core/SCHEMA.md)
  core-api.mdx            @blinn-motion/core exports
  figma-coverage.mdx      Figma Motion support matrix
```

> `FIGMA_MOTION_GAPS.md` is an internal engineering note; the public-facing version is
> `reference/figma-coverage.mdx`.

Editing colors/fonts/nav happens in `docs.json`. The design matches the marketing site:
primary `#2F6BFF`, Space Grotesk headings, Inter body.
