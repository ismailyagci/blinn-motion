#!/usr/bin/env node
/**
 * Generate Open Graph / social thumbnails for Blinn Motion surfaces.
 *
 * Outputs:
 *   site/public/og.png              — landing (1200×630)
 *   site/public/og-square.png       — square share / apple-ish (1200×1200)
 *   site/public/apple-touch-icon.png
 *   docs/images/og-background.png   — Mintlify thumbnails.background
 *   examples/_shared/seo/og.png     — shared lab default
 *   examples/<id>/public/og.png     — per-lab copies (+ next/public)
 *
 * Usage (from repo root or site/):
 *   node site/scripts/generate-og.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const SITE_PUBLIC = join(ROOT, "site/public");
const DOCS_IMAGES = join(ROOT, "docs/images");
const SHARED_SEO = join(ROOT, "examples/_shared/seo");

const W = 1200;
const H = 630;

/** Escape text for SVG */
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Blinn mark (viewBox 0 0 64 64) */
function mark(x, y, size = 72) {
  const s = size / 64;
  return `
  <g transform="translate(${x} ${y}) scale(${s})">
    <rect x="6" y="6" width="52" height="52" rx="15" fill="#11141A"/>
    <g fill="none" stroke="#ffffff" stroke-width="6.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M24 18 V46"/>
      <path d="M24 18 H32.5 C38.6 18 38.6 32 32.5 32 H24"/>
      <path d="M24 32 H34.5 C41.2 32 41.2 46 34.5 46 H24"/>
    </g>
    <rect x="43.6" y="43.6" width="7.6" height="7.6" rx="1.5"
          transform="rotate(45 47.4 47.4)" fill="#2F6BFF"/>
  </g>`;
}

/**
 * @param {object} opts
 * @param {number} opts.width
 * @param {number} opts.height
 * @param {string} opts.title
 * @param {string} opts.subtitle
 * @param {string} [opts.badge]
 * @param {string} [opts.footer]
 * @param {boolean} [opts.backgroundOnly] — no text (Mintlify overlay)
 */
function ogSvg({
  width = W,
  height = H,
  title,
  subtitle,
  badge = "FIGMA MOTION → REAL CODE",
  footer = "blinnmotion.com",
  backgroundOnly = false,
}) {
  // Decorative motion shapes (right panel)
  const shapes = `
    <g opacity="0.92">
      <!-- soft glow blobs -->
      <circle cx="${width - 280}" cy="200" r="120" fill="#2F6BFF" opacity="0.18"/>
      <circle cx="${width - 160}" cy="360" r="90" fill="#7C5CFF" opacity="0.16"/>
      <circle cx="${width - 340}" cy="420" r="70" fill="#22D3EE" opacity="0.12"/>
      <!-- gradient orb -->
      <defs>
        <linearGradient id="orb" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#7AA0FF"/>
          <stop offset="55%" stop-color="#2F6BFF"/>
          <stop offset="100%" stop-color="#22D3EE"/>
        </linearGradient>
        <linearGradient id="diamond" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#FF6BCB"/>
          <stop offset="100%" stop-color="#7C5CFF"/>
        </linearGradient>
        <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#34D399"/>
          <stop offset="100%" stop-color="#2F6BFF"/>
        </linearGradient>
      </defs>
      <circle cx="${width - 300}" cy="210" r="54" fill="url(#orb)"/>
      <rect x="${width - 230}" y="160" width="88" height="88" rx="18"
            fill="url(#diamond)" transform="rotate(18 ${width - 186} 204)"/>
      <circle cx="${width - 170}" cy="300" r="42" fill="none" stroke="url(#ring)" stroke-width="14"
              stroke-dasharray="90 40" stroke-linecap="round"/>
      <rect x="${width - 320}" y="320" width="72" height="72" rx="16" fill="#F59E0B"/>
      <path d="M ${width - 220} 400 L ${width - 190} 450 L ${width - 250} 450 Z" fill="#34D399"/>
      <rect x="${width - 150}" y="380" width="56" height="56" rx="10" fill="#A78BFA" opacity="0.85"/>
    </g>`;

  const content = backgroundOnly
    ? ""
    : `
    ${mark(72, 64, 64)}
    <text x="152" y="108" font-family="Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
          font-size="28" font-weight="600" fill="#E8ECF4" letter-spacing="-0.3">Blinn Motion</text>

    <text x="72" y="183" font-family="JetBrains Mono, ui-monospace, Menlo, monospace"
          font-size="14" font-weight="600" fill="#9DB7FF" letter-spacing="2">${esc(badge)}</text>

    <text x="72" y="280" font-family="Space Grotesk, Inter, ui-sans-serif, system-ui, sans-serif"
          font-size="64" font-weight="700" fill="#FFFFFF" letter-spacing="-1.6">
      ${String(title)
        .split("\n")
        .map((line, i) => `<tspan x="72" dy="${i === 0 ? 0 : 72}">${esc(line)}</tspan>`)
        .join("")}
    </text>

    <text x="72" y="${String(title).includes("\n") ? 460 : 380}"
          font-family="Inter, ui-sans-serif, system-ui, sans-serif"
          font-size="26" font-weight="400" fill="#A8B3C7">
      ${String(subtitle)
        .split("\n")
        .map((line, i) => `<tspan x="72" dy="${i === 0 ? 0 : 36}">${esc(line)}</tspan>`)
        .join("")}
    </text>

    <text x="72" y="${height - 48}" font-family="JetBrains Mono, ui-monospace, Menlo, monospace"
          font-size="18" font-weight="500" fill="#6B7A90">${esc(footer)}</text>
    `;

  // Fix badge pill width dynamically via path not needed for static asset quality

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0B0D12"/>
      <stop offset="45%" stop-color="#11141A"/>
      <stop offset="100%" stop-color="#151A24"/>
    </linearGradient>
    <radialGradient id="glow" cx="78%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#2F6BFF" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#2F6BFF" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect width="100%" height="100%" fill="url(#glow)"/>
  <rect width="100%" height="100%" fill="url(#grid)"/>
  <!-- left accent bar -->
  <rect x="0" y="0" width="8" height="100%" fill="#2F6BFF"/>
  ${shapes}
  ${content}
</svg>`;
}

async function writePng(svg, outPath, { width, height } = { width: W, height: H }) {
  mkdirSync(dirname(outPath), { recursive: true });
  const buf = await sharp(Buffer.from(svg))
    .resize(width, height, { fit: "cover" })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
  writeFileSync(outPath, buf);
  console.log(`wrote ${outPath} (${buf.length} bytes)`);
}

async function writeAppleTouch(outPath) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <rect width="180" height="180" rx="40" fill="#11141A"/>
  <g transform="translate(26 26) scale(2)">
    <g fill="none" stroke="#ffffff" stroke-width="6.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M24 18 V46"/>
      <path d="M24 18 H32.5 C38.6 18 38.6 32 32.5 32 H24"/>
      <path d="M24 32 H34.5 C41.2 32 41.2 46 34.5 46 H24"/>
    </g>
    <rect x="43.6" y="43.6" width="7.6" height="7.6" rx="1.5"
          transform="rotate(45 47.4 47.4)" fill="#2F6BFF"/>
  </g>
</svg>`;
  await writePng(svg, outPath, { width: 180, height: 180 });
}

const LABS = [
  { id: "vanilla", title: "Vanilla lab", subtitle: "DOM + Canvas · no framework" },
  { id: "react", title: "React lab", subtitle: "Dual stages · @blinn-motion/react" },
  { id: "vue", title: "Vue lab", subtitle: "Vue 3 · @blinn-motion/vue" },
  { id: "svelte", title: "Svelte lab", subtitle: "Svelte 5 · @blinn-motion/svelte" },
  { id: "angular", title: "Angular lab", subtitle: "Angular 19 · @blinn-motion/angular" },
  { id: "lit", title: "Lit lab", subtitle: "Web component · @blinn-motion/lit" },
  { id: "next", title: "Next.js lab", subtitle: "App Router · React adapter" },
  { id: "astro", title: "Astro lab", subtitle: "Islands · React + Lit" },
];

/** Per landing-section share cards → site/public/og/sections/{slug}.png */
const SECTIONS = [
  {
    slug: "pipeline",
    title: "Figma → numbers",
    subtitle: "MotionDoc pipeline · sample(doc, t)",
    badge: "THE PIPELINE",
    footer: "blinnmotion.com/s/pipeline",
  },
  {
    slug: "platforms",
    title: "One doc.\nEvery stack.",
    subtitle: "DOM · Canvas · React · Vue · Svelte · more",
    badge: "PLATFORMS",
    footer: "blinnmotion.com/s/platforms",
  },
  {
    slug: "vs-lottie",
    title: "Same motion.\n~8× lighter.",
    subtitle: "Live Blinn vs Lottie head-to-head",
    badge: "VS LOTTIE",
    footer: "blinnmotion.com/s/vs-lottie",
  },
  {
    slug: "performance",
    title: "Tiny player.\nSparse JSON.",
    subtitle: "~9 KB gzip core+DOM vs ~75 KB lottie-web",
    badge: "PERFORMANCE",
    footer: "blinnmotion.com/s/performance",
  },
  {
    slug: "engine",
    title: "sample(doc, t)",
    subtitle: "Pure · DOM-free · springs & curves",
    badge: "RENDER ENGINE",
    footer: "blinnmotion.com/s/engine",
  },
  {
    slug: "features",
    title: "Figma Motion,\nshipped as code",
    subtitle: "Source of truth · diffable · seekable",
    badge: "WHY BLINN",
    footer: "blinnmotion.com/s/features",
  },
  {
    slug: "code",
    title: "Three lines\nto motion",
    subtitle: "npm i @blinn-motion/react",
    badge: "USE IT IN CODE",
    footer: "blinnmotion.com/s/code",
  },
  {
    slug: "compare",
    title: "Ship the\ntimeline",
    subtitle: "Not hand CSS · not baked video",
    badge: "FIGMA AS SOURCE",
    footer: "blinnmotion.com/s/compare",
  },
];

async function main() {
  // Landing OG
  await writePng(
    ogSvg({
      title: "Animate in Figma.\nShip it everywhere.",
      subtitle: "MotionDoc → pure-JS engine → DOM · Canvas · React · Vue · more",
      badge: "FIGMA MOTION → REAL CODE",
      footer: "blinnmotion.com  ·  docs.blinnmotion.com",
    }),
    join(SITE_PUBLIC, "og.png")
  );

  // Square
  await writePng(
    ogSvg({
      width: 1200,
      height: 1200,
      title: "Blinn Motion",
      subtitle: "The runtime for Figma Motion",
      badge: "MOTIONDOC  ·  PURE-JS ENGINE",
      footer: "blinnmotion.com",
    }),
    join(SITE_PUBLIC, "og-square.png"),
    { width: 1200, height: 1200 }
  );

  await writeAppleTouch(join(SITE_PUBLIC, "apple-touch-icon.png"));

  // Mintlify background (no text — title/description overlaid by Mintlify)
  await writePng(
    ogSvg({
      title: "",
      subtitle: "",
      backgroundOnly: true,
    }),
    join(DOCS_IMAGES, "og-background.png")
  );

  // Shared lab default
  mkdirSync(SHARED_SEO, { recursive: true });
  await writePng(
    ogSvg({
      title: "Example lab",
      subtitle: "Live dual-stage MotionDoc demos",
      badge: "BLINN MOTION  ·  EXAMPLE LAB",
      footer: "blinnmotion.com/examples",
    }),
    join(SHARED_SEO, "og.png")
  );

  // Per-lab
  for (const lab of LABS) {
    const svg = ogSvg({
      title: lab.title,
      subtitle: lab.subtitle,
      badge: "LIVE EXAMPLE LAB",
      footer: `${lab.id}.blinnmotion.com`,
    });
    const publicDir =
      lab.id === "next"
        ? join(ROOT, "examples/next/public")
        : join(ROOT, `examples/${lab.id}/public`);
    mkdirSync(publicDir, { recursive: true });
    const out = join(publicDir, "og.png");
    await writePng(svg, out);

    // Keep shared copy reference for docs
  }

  // Also drop a docs-facing static fallback OG (branded, with docs copy)
  await writePng(
    ogSvg({
      title: "Documentation",
      subtitle: "MotionDoc · render engine · adapters · Figma plugin",
      badge: "DOCS  ·  BLINN MOTION",
      footer: "docs.blinnmotion.com",
    }),
    join(DOCS_IMAGES, "og.png")
  );

  // Per-section share images (unique OG per landing section)
  const sectionDir = join(SITE_PUBLIC, "og/sections");
  mkdirSync(sectionDir, { recursive: true });
  for (const sec of SECTIONS) {
    await writePng(
      ogSvg({
        title: sec.title,
        subtitle: sec.subtitle,
        badge: sec.badge,
        footer: sec.footer,
      }),
      join(sectionDir, `${sec.slug}.png`)
    );
  }

  console.log("OG assets generated.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
