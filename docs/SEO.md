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
| OG image | `/og.png` (1200×630) | Link preview thumbnail |
| Square | `/og-square.png` | Alternate share |
| Apple icon | `/apple-touch-icon.png` | iOS home screen |
| robots | `/robots.txt` | Crawl rules + sitemaps |
| sitemap | `/sitemap.xml` | Landing + docs + labs |
| llms.txt | `/llms.txt` | Agent index ([llmstxt.org](https://llmstxt.org)) |
| llms-full | `/llms-full.txt` | Longer agent context |
| well-known | `/.well-known/llms.txt` | Discovery alias |

Meta + JSON-LD live in `site/src/layouts/Base.astro` (canonical, Open Graph, Twitter, SoftwareApplication).

### Regenerate thumbnails

```bash
# from repo root (uses root sharp)
node site/scripts/generate-og.mjs
```

Writes landing, docs background, and every `examples/*/public/og.png`.

## Docs (`docs/`)

Mintlify already generates per-page OG cards, sitemap, robots, and `llms.txt` / `llms-full.txt`.

Configured in `docs/docs.json`:

- `thumbnails.background` → `/images/og-background.png` (branded canvas; title/description overlaid by Mintlify)
- `seo.metatags` → site-wide defaults
- `seo.organization` → JSON-LD publisher entity

Optional static fallback: `docs/images/og.png`.

Do **not** commit a custom `docs/llms.txt` unless you intend to **override** Mintlify’s auto index.

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
