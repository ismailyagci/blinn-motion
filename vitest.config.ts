import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/src/**/*.test.{ts,tsx}"],
    environment: "node",
    environmentMatchGlobs: [["**/*.dom.test.ts", "jsdom"]],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["packages/*/src/**/*.ts"],
      exclude: [
        "packages/*/src/**/*.test.ts",
        "packages/*/src/**/*.d.ts",
        "packages/*/src/index.ts",
        "packages/core/src/types.ts",
        // Figma-runtime (uses the `figma` global; verified live in Figma, not unit-tested)
        "packages/figma-plugin/**",
        // React Native runtime components (need an RN test renderer)
        "packages/react-native/src/BlinnMotionView.tsx",
        "packages/react-native/src/useBlinnMotion.ts",
        "packages/react-native/src/player.ts",
      ],
      thresholds: {
        "packages/core/src/**": { statements: 95, branches: 80, functions: 95, lines: 95 },
      },
    },
  },
});
