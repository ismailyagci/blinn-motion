import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@blinn-motion/lit": resolve(__dirname, "../../packages/lit/src/index.ts"),
      "@blinn-motion/core": resolve(__dirname, "../../packages/core/src/index.ts"),
      "@blinn-motion/dom": resolve(__dirname, "../../packages/dom/src/index.ts"),
      "@blinn-motion/canvas": resolve(__dirname, "../../packages/canvas/src/index.ts"),
    },
  },
});
