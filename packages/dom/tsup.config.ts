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
    external: ["@fottie/core"],
    outExtension({ format }) {
      return { js: format === "cjs" ? ".cjs" : ".js" };
    },
  },
  // Self-contained browser global: bundles @fottie/core inline and exposes
  // `window.Fottie`. Used by the Figma plugin UI, which must be a single file
  // with no module loading / CDN (networkAccess: none).
  {
    entry: { fottie: "src/index.ts" },
    format: ["iife"],
    globalName: "Fottie",
    dts: false,
    clean: false,
    minify: true,
    sourcemap: false,
    target: "es2017",
    // do NOT externalize core here — bundle it so the file stands alone
    noExternal: ["@fottie/core"],
  },
]);
