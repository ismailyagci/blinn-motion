import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import { localBlinnAlias } from "../_shared/local-blinn-alias.mjs";

export default defineConfig({
  integrations: [react()],
  vite: {
    resolve: {
      alias: localBlinnAlias(import.meta.url, {
        "@blinn-motion/react": "../../packages/react/src/index.ts",
        "@blinn-motion/lit": "../../packages/lit/src/index.ts",
        "@blinn-motion/core": "../../packages/core/src/index.ts",
        "@blinn-motion/dom": "../../packages/dom/src/index.ts",
        "@blinn-motion/canvas": "../../packages/canvas/src/index.ts",
      }),
    },
  },
});
