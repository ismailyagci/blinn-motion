/**
 * Inject crawl surfaces into Mintlify static export (docs/dist).
 * Mintlify SPA export often omits real robots.txt / sitemap.xml —
 * requests fall through to index.html (text/html), which breaks GSC.
 *
 * Run after unpack-export.mjs (or from CI after unzip).
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const seoDir = join(root, "seo");
const origin = "https://docs.blinnmotion.com";

if (!existsSync(dist) || !existsSync(join(dist, "index.html"))) {
  console.error("docs/dist missing — run mint export + unpack first");
  process.exit(1);
}

function collectPages() {
  const cfg = JSON.parse(readFileSync(join(root, "docs.json"), "utf8"));
  const pages = [];
  for (const tab of cfg.navigation?.tabs || []) {
    for (const group of tab.groups || []) {
      for (const p of group.pages || []) pages.push(p);
    }
  }
  return pages;
}

function pathFor(page) {
  if (page === "index") return `${origin}/`;
  return `${origin}/${page}/`;
}

function buildSitemap(pages) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = pages.map((p) => {
    const loc = pathFor(p);
    const priority = p === "index" ? "1.0" : p === "quickstart" ? "0.9" : "0.8";
    const changefreq = p === "index" || p.startsWith("guides/") ? "weekly" : "monthly";
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
}

function buildLlmsTxt(pages) {
  const lines = [
    "# Blinn Motion Docs",
    "",
    "> The runtime for Figma Motion. MotionDoc → pure-JS engine → DOM · Canvas · React · Vue · Svelte · Angular · Lit · React Native.",
    "",
    "## Product",
    "",
    `- [Landing](https://blinnmotion.com/): Product overview and live labs`,
    `- [Documentation home](${origin}/): Concepts, adapters, plugin, API`,
    `- [GitHub](https://github.com/ismailyagci/blinn-motion): Source monorepo`,
    "",
    "## Docs pages",
    "",
  ];
  for (const p of pages) {
    const title =
      p === "index"
        ? "Introduction"
        : p
            .split("/")
            .pop()
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
    lines.push(`- [${title}](${pathFor(p)})`);
  }
  lines.push(
    "",
    "## Also",
    "",
    `- [Landing llms.txt](https://blinnmotion.com/llms.txt)`,
    `- [Sitemap](${origin}/sitemap.xml)`,
    ""
  );
  return lines.join("\n");
}

// Always write authoritative crawl files (overwrite SPA leftovers).
const pages = collectPages();
writeFileSync(join(dist, "robots.txt"), readFileSync(join(seoDir, "robots.txt"), "utf8"));
writeFileSync(join(dist, "sitemap.xml"), buildSitemap(pages));
writeFileSync(join(dist, "llms.txt"), buildLlmsTxt(pages));

if (existsSync(join(seoDir, "_headers"))) {
  copyFileSync(join(seoDir, "_headers"), join(dist, "_headers"));
}

// Optional: copy static og fallback if present
const og = join(root, "images", "og.png");
if (existsSync(og) && !existsSync(join(dist, "og.png"))) {
  mkdirSync(join(dist, "images"), { recursive: true });
  copyFileSync(og, join(dist, "images", "og.png"));
}

console.log(`OK — injected SEO into docs/dist (${pages.length} sitemap URLs)`);
