/** @type {import('next').NextConfig} */
const nextConfig = {
  // Consume workspace package dists (built by monorepo `npm run build`).
  transpilePackages: [
    "@blinn-motion/react",
    "@blinn-motion/core",
    "@blinn-motion/dom",
    "@blinn-motion/canvas",
  ],
};

export default nextConfig;
