// @ts-check
import { defineConfig } from "astro/config";

// Standalone marketing site for BlinnMotion. Static output — no SSR needed.
export default defineConfig({
  site: "https://blinnmotion.dev",
  server: { port: 4321 },
  devToolbar: { enabled: false },
});
