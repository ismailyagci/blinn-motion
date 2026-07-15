import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@blinn-motion/vue": resolve(__dirname, "../../packages/vue/src/index.ts"),
      "@blinn-motion/core": resolve(__dirname, "../../packages/core/src/index.ts"),
      "@blinn-motion/dom": resolve(__dirname, "../../packages/dom/src/index.ts"),
      "@blinn-motion/canvas": resolve(__dirname, "../../packages/canvas/src/index.ts"),
    },
  },
});
