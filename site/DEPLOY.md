# Deploying the landing page (`blinnmotion.com`)

Static Astro site → **Cloudflare Pages** via GitHub Actions
(`.github/workflows/deploy-site.yml`).

## One-time setup

### 1. Cloudflare API token

1. [Cloudflare dashboard](https://dash.cloudflare.com/profile/api-tokens) → **Create Token**
2. Use template **Edit Cloudflare Workers** *or* custom token with:
   - **Account** → Cloudflare Pages → Edit
   - **Account** → Account Settings → Read
3. Scope to the account that owns **blinnmotion.com**

Copy:

- **API Token** → GitHub secret `CLOUDFLARE_API_TOKEN`
- **Account ID** (Workers & Pages overview, right sidebar) → GitHub secret `CLOUDFLARE_ACCOUNT_ID`

### 2. GitHub secrets

Repo → **Settings → Secrets and variables → Actions**:

| Secret                   | Value                |
|--------------------------|----------------------|
| `CLOUDFLARE_API_TOKEN`   | token from step 1    |
| `CLOUDFLARE_ACCOUNT_ID`  | 32-char account id   |

### 3. First deploy

Either:

- Push a change under `site/` to `main`, or  
- **Actions → Deploy landing → Run workflow**

The workflow creates the Pages project **`blinn-motion`** on first run if it
does not exist (`wrangler pages project create`), then uploads `dist/`.

Preview URL: `https://blinn-motion.pages.dev`

### 4. Custom domains

Cloudflare dashboard → **Workers & Pages** → **blinn-motion** → **Custom domains**:

1. Add `blinnmotion.com`
2. Add `www.blinnmotion.com` (optional; redirect www → apex in Pages or a Redirect Rule)

Because the domain is already on Cloudflare, records are usually applied automatically.

Suggested DNS if you add them manually:

| Type  | Name | Target                         | Proxy   |
|-------|------|--------------------------------|---------|
| CNAME | @    | `blinn-motion.pages.dev`       | Proxied |
| CNAME | www  | `blinn-motion.pages.dev`       | Proxied |

(Cloudflare allows CNAME flattening on the apex when proxied.)

### 5. SSL

Pages custom domains use Cloudflare Universal SSL. Wait a few minutes after attaching the domain; status should become **Active**.

## Local build

Astro 7 needs **Node ≥ 22.12**. CI uses Node 22 for the same reason.

```bash
cd site
npm install
npm run build     # → site/dist
npm run preview
```

## Path filters

The workflow only runs when `site/**` or the workflow file changes.
Use **workflow_dispatch** to redeploy without a code change.
