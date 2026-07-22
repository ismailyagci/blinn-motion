# SEO, social previews & LLM indexes

This note covers **landing**, **docs**, and **example labs**.

## Surfaces

| Surface | Origin | Hosting |
|---------|--------|---------|
| Landing | https://blinnmotion.com | Cloudflare Pages (`site/`) |
| Docs | https://docs.blinnmotion.com | Mintlify (`docs/`) |
| Labs | https://{lab}.blinnmotion.com | Cloudflare Pages (`examples/`) |

## Landing (`site/`)

| Asset | Path | Role |
|-------|------|------|
| OG image | `/og.png` (1200×630) | Default link preview |
| Square | `/og-square.png` | Alternate share |
| Section OGs | `/og/sections/{slug}.png` | Per-section share cards |
| Share URLs | `/s/{slug}` | Unique OG meta → redirects to `/#{hash}` |
| Apple icon | `/apple-touch-icon.png` | iOS home screen |
| robots | `/robots.txt` | Crawl rules + sitemaps |
| sitemap | `/sitemap.xml` | Landing + share pages + docs + labs |
| llms.txt | `/llms.txt` | Agent index ([llmstxt.org](https://llmstxt.org)) |
| llms-full | `/llms-full.txt` | Longer agent context |
| well-known | `/.well-known/llms.txt` | Discovery alias |

Meta + JSON-LD live in `site/src/layouts/Base.astro` (canonical, Open Graph, Twitter, SoftwareApplication).

**Why `/s/{slug}`?** Open Graph crawlers ignore URL `#hash` fragments, so `#live-compare`
always shows the homepage card. Share pages under `/s/` carry section-specific
`og:title` / `og:description` / `og:image`, then redirect humans to the real section.

Slugs (see `site/src/data/sections.ts`): `pipeline`, `platforms`, `vs-lottie`,
`performance`, `engine`, `features`, `code`, `compare`.

### Regenerate thumbnails

```bash
# from repo root (uses root sharp)
node site/scripts/generate-og.mjs
```

Writes landing, docs background, and every `examples/*/public/og.png`.

## Docs (`docs/`)

Mintlify static export (`mint export` → Cloudflare Pages) is an SPA-style bundle.
**Without injection**, `/robots.txt`, `/sitemap.xml`, and `/llms.txt` often return
`text/html` (homepage shell) — which breaks Google Search Console sitemaps.

### Fix (required on every docs deploy)

`docs/scripts/inject-seo.mjs` writes real crawl files into `docs/dist/` after unpack:

| File | Source |
|------|--------|
| `robots.txt` | `docs/seo/robots.txt` |
| `sitemap.xml` | generated from `docs.json` navigation |
| `llms.txt` | generated from nav pages |
| `_headers` | `docs/seo/_headers` (content-types) |

CI runs inject after unzip (`.github/workflows/deploy-docs.yml`). Locally:
`npm run build` in `docs/` (unpack calls inject).

### Edge backup (Cloudflare Worker)

Worker **`blinn-docs-seo`** is routed on:

- `docs.blinnmotion.com/robots.txt`
- `docs.blinnmotion.com/sitemap.xml`
- `docs.blinnmotion.com/llms.txt`

It returns `text/plain` / `application/xml` with header `x-blinn-seo: worker`.
Keep the inject step so Pages origin is also correct if routes change.

### Mintlify config

Configured in `docs/docs.json`:

- `thumbnails.background` → `/images/og-background.png`
- `seo.metatags` → site-wide defaults
- `seo.organization` → JSON-LD publisher entity

Optional static fallback: `docs/images/og.png`.

## Example labs

Each web lab ships:

- Full Open Graph / Twitter meta in `index.html` (or Next `metadata`)
- `/og.png` in `public/`
- `/robots.txt` (points sitemap at landing)

Shared template notes: `examples/_shared/seo/`.

## QA checklist

### Automated

```bash
node scripts/seo-qa.mjs
node scripts/seo-qa.mjs --only landing,docs,react
```

After deploy, every surface should:

1. Return real `robots.txt` / `sitemap.xml` / `llms.txt` (not HTML SPA fallback)
2. Include `og:image` → PNG ≥ ~10 KB with `image/*` content-type
3. Have unique title + description ≥ ~40 chars
4. Prefer absolute `og:image` / `canonical` URLs

### Manual link preview

Paste URLs into:

- [opengraph.xyz](https://www.opengraph.xyz/) or [metatags.io](https://metatags.io/)
- Slack / Discord / iMessage (cache may lag — append `?v=2` once after OG change)
- X/Twitter Card Validator (if available)

### Google / Bing (optional)

1. Search Console → property `https://blinnmotion.com` + `https://docs.blinnmotion.com`
2. Submit sitemaps: `/sitemap.xml` (landing includes labs; docs has its own)
3. Verification token → `seo.metatags["google-site-verification"]` in `docs.json` and/or a landing meta if needed

## Common failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| Link shows no image | Missing `og:image` or image returns HTML | Ensure PNG in `public/` and absolute URL |
| `robots.txt` is the homepage | SPA rewrite catch-all | Static file must win over `/* → index.html` on Pages |
| Docs OG shows mintlify.app host | Default Mintlify image CDN | `thumbnails.background` + custom domain is fine; optional static `og:image` |
| Stale preview after redesign | Platform cache | Change query `?v=` once or wait |

## CI notes

- Landing deploy: `.github/workflows/deploy-site.yml` (path `site/**`)
- Docs deploy: `.github/workflows/deploy-docs.yml`
- Examples deploy: `.github/workflows/deploy-examples.yml`

Regenerate OG assets before release if brand copy changes; commit the PNGs (they are binary products of `generate-og.mjs`).
