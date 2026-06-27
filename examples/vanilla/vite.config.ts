import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// Allow importing the shared MotionDoc from the repo-root /fixtures folder.
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

export default defineConfig({
  server: { fs: { allow: [repoRoot] }, port: 5173 },
});
