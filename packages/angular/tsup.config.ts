import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  target: "es2020",
  external: [
    "@angular/core",
    "@angular/common",
    "rxjs",
    "@blinn-motion/core",
    "@blinn-motion/dom",
    "@blinn-motion/canvas",
  ],
  outExtension({ format }) {
    return { js: format === "cjs" ? ".cjs" : ".js" };
  },
});
