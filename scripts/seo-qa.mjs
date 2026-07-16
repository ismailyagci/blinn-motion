#!/usr/bin/env node
/**
 * SEO / social-preview QA for Blinn Motion surfaces.
 *
 * Checks production (or BASE override) for:
 *   - robots.txt / sitemap.xml / llms.txt content-type & shape
 *   - HTML meta: title, description, canonical, og:*, twitter:*
 *   - OG image HTTP 200 + image/* content-type + size > 10kb
 *
 * Usage:
 *   node scripts/seo-qa.mjs
 *   node scripts/seo-qa.mjs --only landing,docs,react
 *   SEO_BASE=https://blinnmotion.com node scripts/seo-qa.mjs
 */
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    only: { type: "string", default: "" },
    timeout: { type: "string", default: "15000" },
  },
});

const TIMEOUT = Number(values.timeout) || 15_000;

const SURFACES = [
  {
    id: "landing",
    origin: "https://blinnmotion.com",
    expectTitle: /Blinn Motion/i,
    expectOg: true,
    expectLlms: true,
    expectSitemap: true,
    expectRobots: true,
  },
  {
    id: "docs",
    origin: "https://docs.blinnmotion.com",
    expectTitle: /Blinn Motion/i,
    expectOg: true,
    expectLlms: true, // Mintlify auto
    expectSitemap: true,
    expectRobots: true,
  },
  {
    id: "react",
    origin: "https://react.blinnmotion.com",
    expectTitle: /React/i,
    expectOg: true,
  },
  {
    id: "vanilla",
    origin: "https://vanilla.blinnmotion.com",
    expectTitle: /Vanilla/i,
    expectOg: true,
  },
  {
    id: "vue",
    origin: "https://vue.blinnmotion.com",
    expectTitle: /Vue/i,
    expectOg: true,
  },
  {
    id: "svelte",
    origin: "https://svelte.blinnmotion.com",
    expectTitle: /Svelte/i,
    expectOg: true,
  },
  {
    id: "angular",
    origin: "https://angular.blinnmotion.com",
    expectTitle: /Angular/i,
    expectOg: true,
  },
  {
    id: "lit",
    origin: "https://lit.blinnmotion.com",
    expectTitle: /Lit/i,
    expectOg: true,
  },
  {
    id: "next",
    origin: "https://next.blinnmotion.com",
    expectTitle: /Next/i,
    expectOg: true,
  },
  {
    id: "astro",
    origin: "https://astro.blinnmotion.com",
    expectTitle: /Astro/i,
    expectOg: true,
  },
];

const only = values.only
  ? new Set(values.only.split(",").map((s) => s.trim()).filter(Boolean))
  : null;

function meta(html, attr, key) {
  // property="og:title" content="..."  OR name="description" content="..."
  const re = new RegExp(
    `<meta[^>]+(?:${attr}=["']${key}["'][^>]+content=["']([^"']*)["']|content=["']([^"']*)["'][^>]+${attr}=["']${key}["'])`,
    "i"
  );
  const m = html.match(re);
  return m ? m[1] || m[2] || "" : "";
}

function title(html) {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m ? m[1].trim() : "";
}

function link(html, rel) {
  const re = new RegExp(
    `<link[^>]+rel=["']${rel}["'][^>]+href=["']([^"']+)["']|<link[^>]+href=["']([^"']+)["'][^>]+rel=["']${rel}["']`,
    "i"
  );
  const m = html.match(re);
  return m ? m[1] || m[2] || "" : "";
}

async function fetchText(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "BlinnMotion-SEO-QA/1.0" },
      redirect: "follow",
    });
    const buf = Buffer.from(await res.arrayBuffer());
    const ct = res.headers.get("content-type") || "";
    return { ok: res.ok, status: res.status, ct, buf, text: buf.toString("utf8") };
  } finally {
    clearTimeout(t);
  }
}

function looksLikeHtml(text, ct) {
  if (/text\/html/i.test(ct)) return true;
  const head = text.slice(0, 200).toLowerCase();
  return head.includes("<!doctype html") || head.includes("<html");
}

let failures = 0;
let checks = 0;

function pass(msg) {
  checks++;
  console.log(`  ✓ ${msg}`);
}
function fail(msg) {
  checks++;
  failures++;
  console.log(`  ✗ ${msg}`);
}

async function checkSurface(s) {
  console.log(`\n▸ ${s.id}  ${s.origin}`);
  const home = await fetchText(s.origin + "/");
  if (!home.ok) {
    fail(`home HTTP ${home.status}`);
    return;
  }
  pass(`home HTTP ${home.status}`);

  const t = title(home.text);
  if (s.expectTitle && s.expectTitle.test(t)) pass(`title: ${t}`);
  else fail(`title missing/mismatch: ${JSON.stringify(t)}`);

  const desc = meta(home.text, "name", "description");
  if (desc.length >= 40) pass(`description (${desc.length} chars)`);
  else fail(`description too short/missing: ${JSON.stringify(desc)}`);

  if (s.expectOg) {
    const ogTitle = meta(home.text, "property", "og:title");
    const ogDesc = meta(home.text, "property", "og:description");
    const ogImage = meta(home.text, "property", "og:image");
    const twCard = meta(home.text, "name", "twitter:card");
    if (ogTitle) pass(`og:title`);
    else fail(`og:title missing`);
    if (ogDesc) pass(`og:description`);
    else fail(`og:description missing`);
    if (ogImage) {
      const abs = ogImage.startsWith("http") ? ogImage : new URL(ogImage, s.origin).href;
      const img = await fetchText(abs);
      if (img.ok && /image\//i.test(img.ct) && img.buf.length > 10_000) {
        pass(`og:image ${abs} (${img.buf.length}b, ${img.ct})`);
      } else if (img.ok && /image\//i.test(img.ct)) {
        fail(`og:image too small (${img.buf.length}b): ${abs}`);
      } else {
        fail(`og:image bad HTTP ${img.status} ct=${img.ct}: ${abs}`);
      }
    } else fail(`og:image missing`);
    if (/summary_large_image/i.test(twCard)) pass(`twitter:card`);
    else fail(`twitter:card=${JSON.stringify(twCard)}`);
  }

  const can = link(home.text, "canonical");
  if (can) pass(`canonical: ${can}`);
  else if (s.id === "docs") pass(`canonical optional (Mintlify)`);
  else fail(`canonical missing`);

  if (s.expectRobots) {
    const r = await fetchText(s.origin + "/robots.txt");
    if (r.ok && !looksLikeHtml(r.text, r.ct) && /user-agent/i.test(r.text)) {
      pass(`robots.txt (${r.buf.length}b)`);
    } else {
      fail(`robots.txt missing or HTML fallback (status=${r.status} ct=${r.ct})`);
    }
  }

  if (s.expectSitemap) {
    const sm = await fetchText(s.origin + "/sitemap.xml");
    if (sm.ok && !looksLikeHtml(sm.text, sm.ct) && /urlset|sitemapindex/i.test(sm.text)) {
      pass(`sitemap.xml (${sm.buf.length}b)`);
    } else {
      fail(`sitemap.xml missing or HTML fallback (status=${sm.status})`);
    }
  }

  if (s.expectLlms) {
    const l = await fetchText(s.origin + "/llms.txt");
    if (l.ok && !looksLikeHtml(l.text, l.ct) && /^#\s+/m.test(l.text)) {
      pass(`llms.txt (${l.buf.length}b)`);
    } else {
      fail(`llms.txt missing or HTML fallback (status=${l.status})`);
    }
  }
}

async function main() {
  console.log("Blinn Motion SEO QA");
  const list = only ? SURFACES.filter((s) => only.has(s.id)) : SURFACES;
  for (const s of list) {
    try {
      await checkSurface(s);
    } catch (e) {
      fail(`${s.id} threw: ${e.message || e}`);
    }
  }
  console.log(`\n${checks - failures}/${checks} checks passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
}

main();
