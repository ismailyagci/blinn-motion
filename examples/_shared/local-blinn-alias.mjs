/**
 * Prefer monorepo package sources when present (local dev with HMR).
 * In CI / prod staging without packages/, return {} so npm registry
 * installs of @blinn-motion/* are used instead.
 */
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @param {string} importMetaUrl - import.meta.url of the vite/astro config
 * @param {Record<string, string>} map - package name → path relative to example root
 * @returns {Record<string, string>}
 */
export function localBlinnAlias(importMetaUrl, map) {
  const exampleRoot = dirname(fileURLToPath(importMetaUrl));
  const coreProbe = resolve(exampleRoot, "../../packages/core/src/index.ts");
  if (!existsSync(coreProbe)) return {};

  /** @type {Record<string, string>} */
  const out = {};
  for (const [name, rel] of Object.entries(map)) {
    out[name] = resolve(exampleRoot, rel);
  }
  return out;
}
