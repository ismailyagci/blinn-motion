import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      "@blinn-motion/svelte": resolve(__dirname, "../../packages/svelte/src/index.ts"),
      "@blinn-motion/core": resolve(__dirname, "../../packages/core/src/index.ts"),
      "@blinn-motion/dom": resolve(__dirname, "../../packages/dom/src/index.ts"),
      "@blinn-motion/canvas": resolve(__dirname, "../../packages/canvas/src/index.ts"),
    },
  },
});
