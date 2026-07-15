# Deploying docs (`docs.blinnmotion.com`)

Docs are authored as **Mintlify** MDX (`docs.json` + `*.mdx`). For production we
run **`mint export`** → static HTML/JS zip → unpack → **Cloudflare Pages**
(same model as the landing page).

| | |
|--|--|
| Preview (Pages) | `https://blinn-motion-docs.pages.dev` |
| Production | `https://docs.blinnmotion.com` |
| Workflow | `.github/workflows/deploy-docs.yml` |
| Pages project | `blinn-motion-docs` |

> Official Mintlify docs label offline/static export as Enterprise; in practice
> `mint export` currently produces a full static zip for this repo (verified
> locally). If a future CLI version gates it, re-check plan / CLI output.

## Secrets

Same as landing (`site/DEPLOY.md`):

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Pages Edit |
| `CLOUDFLARE_ACCOUNT_ID` | Account id |

## First deploy

1. Secrets already set for landing → reuse them  
2. **Actions → Deploy docs → Run workflow** (or push a change under `docs/`)  
3. Open `https://blinn-motion-docs.pages.dev`  
4. Cloudflare → **Workers & Pages → blinn-motion-docs → Custom domains**  
5. Add **`docs.blinnmotion.com`**

Domain is already on Cloudflare → DNS is usually applied automatically.

## Local export

```bash
cd docs
npm install
npx mint export --output export.zip
unzip -q export.zip -d dist
# open dist/index.html via any static server, e.g.:
npx serve dist
```

`export.zip` and `docs/dist/` are gitignored.

## Local preview (live Mintlify dev server)

```bash
cd docs
npm install
npm run dev    # http://localhost:3000
```

## What the CI does

1. Validate `docs.json` + nav page files exist  
2. `mint export` → static bundle  
3. Unzip to `dist/` (drop `serve.js` / launcher scripts)  
4. `wrangler pages deploy` to project `blinn-motion-docs`  

<!-- deploy: 2026-07-15T14:36Z -->
