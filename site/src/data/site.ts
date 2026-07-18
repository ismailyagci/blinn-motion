// Central place for links + copy used across the landing page and SEO surfaces.
export const site = {
  name: "Blinn Motion",
  tagline: "The runtime for Figma Motion",
  /** Primary marketing origin (no trailing slash) */
  url: "https://blinnmotion.com",
  /** Default social / link-preview image (absolute) */
  ogImage: "https://blinnmotion.com/og.png",
  ogImageAlt:
    "Blinn Motion — Animate in Figma. Ship it everywhere. MotionDoc to pure-JS engine across every platform.",
  locale: "en_US",
  themeColor: "#ffffff",
  themeColorDark: "#0B0D12",
  repo: "https://github.com/ismailyagci/blinn-motion",
  npm: "https://www.npmjs.com/org/blinn-motion",
  // The Mintlify docs app. Production default; for local dev the docs run at
  // http://localhost:3000 (npm run dev in /docs) — point this there to test the link.
  docs: "https://docs.blinnmotion.com",
  /** Default page title + description for <Base> */
  title: "Blinn Motion — Figma Motion → real code",
  description:
    "The runtime for Figma Motion. Export a Motion timeline to MotionDoc and play it with a pure-JS engine — identical across DOM, Canvas, React, Vue, Svelte, Angular, Lit and React Native.",
  keywords: [
    "Blinn Motion",
    "Figma Motion",
    "MotionDoc",
    "animation runtime",
    "Figma to code",
    "motion design",
    "React animation",
    "Canvas animation",
    "CSS animation engine",
  ],
  sameAs: [
    "https://github.com/ismailyagci/blinn-motion",
    "https://www.npmjs.com/org/blinn-motion",
    "https://docs.blinnmotion.com",
  ],
  nav: [
    { label: "Pipeline", href: "#pipeline" },
    { label: "Platforms", href: "#platforms" },
    { label: "vs Lottie", href: "#live-compare" },
    { label: "Engine", href: "#engine" },
    { label: "Code", href: "#code" },
  ],
} as const;
