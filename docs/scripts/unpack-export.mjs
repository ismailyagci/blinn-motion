/**
 * Unzip mint export into docs/dist for local static preview / CF-like layout.
 * CI does the same steps inline; this is for `npm run build` locally.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const zip = join(root, "export.zip");
const dist = join(root, "dist");

if (!existsSync(zip)) {
  console.error("export.zip missing — run: npm run export");
  process.exit(1);
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
execFileSync("unzip", ["-q", zip, "-d", dist], { stdio: "inherit" });

for (const f of ["export.zip", "serve.js", "Start Docs.bat", "Start Docs.command"]) {
  const p = join(dist, f);
  if (existsSync(p)) unlinkSync(p);
}

if (!existsSync(join(dist, "index.html"))) {
  console.error("dist/index.html missing after unpack");
  process.exit(1);
}

// Real robots.txt / sitemap.xml / llms.txt (Mintlify SPA often serves HTML for these).
execFileSync(process.execPath, [join(root, "scripts", "inject-seo.mjs")], { stdio: "inherit" });

console.log("OK — static docs in docs/dist/");
