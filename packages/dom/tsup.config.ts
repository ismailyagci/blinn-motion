import { defineConfig } from "tsup";

export default defineConfig([
  // Library build: ESM + CJS, core kept external.
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    sourcemap: true,
    treeshake: true,
    target: "es2020",
    external: ["@blinn-motion/core"],
    outExtension({ format }) {
      return { js: format === "cjs" ? ".cjs" : ".js" };
    },
  },
  // Self-contained browser global: bundles @blinn-motion/core inline and exposes
  // `window.BlinnMotion`. Used by the Figma plugin UI, which must be a single file
  // with no module loading / CDN (networkAccess: none).
  {
    entry: { "blinn-motion": "src/index.ts" },
    format: ["iife"],
    globalName: "BlinnMotion",
    dts: false,
    clean: false,
    minify: true,
    sourcemap: false,
    target: "es2017",
    // do NOT externalize core here — bundle it so the file stands alone
    noExternal: ["@blinn-motion/core"],
  },
]);
