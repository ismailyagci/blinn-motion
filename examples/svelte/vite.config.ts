import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { localBlinnAlias } from "../_shared/local-blinn-alias.mjs";

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: localBlinnAlias(import.meta.url, {
      "@blinn-motion/svelte": "../../packages/svelte/src/index.ts",
      "@blinn-motion/core": "../../packages/core/src/index.ts",
      "@blinn-motion/dom": "../../packages/dom/src/index.ts",
      "@blinn-motion/canvas": "../../packages/canvas/src/index.ts",
    }),
  },
});
