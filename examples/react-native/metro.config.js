// Metro config for running this Expo app inside the BlinnMotion monorepo.
// It watches the repo root so Metro can resolve the symlinked @blinn-motion/* workspace
// packages and the shared /fixtures folder.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo
config.watchFolders = [repoRoot];

// 2. Resolve modules from both the app and the repo root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(repoRoot, "node_modules"),
];

// 3. Follow symlinks (workspace packages) — Metro >= 0.80 handles this natively.
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
