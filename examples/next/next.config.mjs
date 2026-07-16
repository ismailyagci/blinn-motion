/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for Cloudflare Pages (no Node server).
  output: "export",
  images: { unoptimized: true },
  // Local monorepo: consume workspace package source/dist.
  // Prod staging installs published @blinn-motion/* from npm — these are no-ops then.
  transpilePackages: [
    "@blinn-motion/react",
    "@blinn-motion/core",
    "@blinn-motion/dom",
    "@blinn-motion/canvas",
  ],
};

export default nextConfig;
