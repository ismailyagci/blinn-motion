import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  target: "es2020",
  // The host app supplies react / react-native; core is a workspace dep.
  external: ["react", "react-native", "@blinn-motion/core"],
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
  outExtension({ format }) {
    return { js: format === "cjs" ? ".cjs" : ".js" };
  },
});
