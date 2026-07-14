# Deploying docs (`docs.blinnmotion.com`)

Docs are a **Mintlify** site. Cloudflare only manages DNS for the custom domain;
Mintlify builds and hosts the HTML.

## One-time setup

### 1. Connect Mintlify → GitHub

1. Open [mintlify.com/start](https://mintlify.com/start)
2. Connect the `ismailyagci/blinn-motion` repository
3. Set the **docs directory** to `docs` (this monorepo’s Mintlify root)
4. Install the Mintlify GitHub App (read access to the repo)

After that, every push to `main` that touches `docs/` triggers a Mintlify deploy.
Staging URLs look like `*.mintlify.app` / `*.mintlify.site` until the custom domain is live.

### 2. Custom domain on Mintlify

1. Mintlify dashboard → **Settings → Custom domain**
2. Add `docs.blinnmotion.com`
3. Copy the CNAME target Mintlify shows (usually `cname.mintlify.com`)

### 3. DNS on Cloudflare

In the **blinnmotion.com** zone:

| Type  | Name | Target                         | Proxy status      |
|-------|------|--------------------------------|-------------------|
| CNAME | docs | `cname.mintlify.com` (or Mintlify’s value) | DNS only (grey cloud) **or** Proxied if Mintlify allows |

Mintlify’s docs typically recommend **DNS only** (grey cloud) so their certs issue cleanly.
If you enable the orange cloud, use Full (strict) SSL and follow Mintlify’s Cloudflare notes.

### 4. GitHub Actions

`.github/workflows/deploy-docs.yml` validates `docs.json` and page presence on PRs / main.
It does **not** replace Mintlify hosting — deploy still comes from the Mintlify GitHub App.

## Local preview

```bash
cd docs
npm install
npm run dev    # usually http://localhost:3000
```
