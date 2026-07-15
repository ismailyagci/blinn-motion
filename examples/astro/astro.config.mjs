import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  integrations: [react()],
  vite: {
    resolve: {
      alias: {
        "@blinn-motion/react": path.resolve(root, "../../packages/react/src/index.ts"),
        "@blinn-motion/lit": path.resolve(root, "../../packages/lit/src/index.ts"),
        "@blinn-motion/core": path.resolve(root, "../../packages/core/src/index.ts"),
        "@blinn-motion/dom": path.resolve(root, "../../packages/dom/src/index.ts"),
        "@blinn-motion/canvas": path.resolve(root, "../../packages/canvas/src/index.ts"),
      },
    },
  },
});
