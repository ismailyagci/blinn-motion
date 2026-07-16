import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { localBlinnAlias } from "../_shared/local-blinn-alias.mjs";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: localBlinnAlias(import.meta.url, {
      "@blinn-motion/vue": "../../packages/vue/src/index.ts",
      "@blinn-motion/core": "../../packages/core/src/index.ts",
      "@blinn-motion/dom": "../../packages/dom/src/index.ts",
      "@blinn-motion/canvas": "../../packages/canvas/src/index.ts",
    }),
  },
});
