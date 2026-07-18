/**
 * Shareable landing sections — each gets its own URL (/s/{slug}) and OG image
 * so social previews can target a specific part of the page.
 *
 * Crawlers read meta on /s/{slug}; humans are redirected to /#{hash}.
 * Hash-only URLs cannot carry unique Open Graph tags (crawlers ignore #fragments).
 */
export type ShareSection = {
  /** URL path segment: /s/{slug} */
  slug: string;
  /** In-page anchor on the home page */
  hash: string;
  /** Short nav / card label */
  label: string;
  /** og:title + <title> */
  title: string;
  /** og:description */
  description: string;
  /** Badge line on the generated OG art */
  badge: string;
  /** One-line subtitle on OG art */
  subtitle: string;
  /** Absolute or root-relative OG image */
  image: string;
  /** Alt text for the OG image */
  imageAlt: string;
};

export const shareSections: ShareSection[] = [
  {
    slug: "pipeline",
    hash: "pipeline",
    label: "Pipeline",
    title: "Blinn Motion — Figma timeline → pure numbers",
    description:
      "Figma Motion → MotionDoc → sample(doc, t). One open document, one deterministic render tree, every platform.",
    badge: "THE PIPELINE",
    subtitle: "Figma Motion → MotionDoc → sample(doc, t)",
    image: "/og/sections/pipeline.png",
    imageAlt: "Blinn Motion pipeline — Figma Motion to MotionDoc to pure render tree",
  },
  {
    slug: "platforms",
    hash: "platforms",
    label: "Platforms",
    title: "Blinn Motion — one document, every stack",
    description:
      "DOM, Canvas, React, Vue, Svelte, Angular, Lit, React Native — same MotionDoc, same timing. Live labs included.",
    badge: "PLATFORMS",
    subtitle: "DOM · Canvas · React · Vue · Svelte · Angular · Lit · RN",
    image: "/og/sections/platforms.png",
    imageAlt: "Blinn Motion platforms — adapters for every major stack",
  },
  {
    slug: "vs-lottie",
    hash: "live-compare",
    label: "vs Lottie",
    title: "Blinn vs Lottie — same motion, smaller payload",
    description:
      "Live head-to-head: a real Lottie file next to a pixel-matched MotionDoc. ~8× smaller animation JSON, ~8× lighter total ship cost.",
    badge: "LIVE HEAD-TO-HEAD",
    subtitle: "Same motion · ~8× lighter ship cost",
    image: "/og/sections/vs-lottie.png",
    imageAlt: "Blinn Motion vs Lottie live comparison — same motion, smaller payload",
  },
  {
    slug: "performance",
    hash: "performance",
    label: "Performance",
    title: "Blinn Motion — built lighter than Lottie for UI",
    description:
      "~9 KB gzip player (core + DOM) vs ~75 KB lottie-web. Sparse MotionDoc keyframes for product UI motion.",
    badge: "PERFORMANCE",
    subtitle: "~9 KB player · sparse MotionDoc · product UI",
    image: "/og/sections/performance.png",
    imageAlt: "Blinn Motion performance — lighter player than Lottie for product UI",
  },
  {
    slug: "engine",
    hash: "engine",
    label: "Engine",
    title: "Blinn Motion — one pure method: sample(doc, t)",
    description:
      "Time-based, DOM-free render core. Springs, cubic-bezier, stacked tracks — adapters only paint final numbers.",
    badge: "RENDER ENGINE",
    subtitle: "sample(doc, t) · pure · DOM-free",
    image: "/og/sections/engine.png",
    imageAlt: "Blinn Motion render engine — sample(doc, t)",
  },
  {
    slug: "features",
    hash: "features",
    label: "Features",
    title: "Blinn Motion — Figma Motion, shipped as code",
    description:
      "Figma as source of truth, git-diffable MotionDoc, clock or progress-driven playback, built for product UI.",
    badge: "WHY BLINN",
    subtitle: "Figma source of truth · diffable JSON · seek & scrub",
    image: "/og/sections/features.png",
    imageAlt: "Why Blinn Motion — Figma Motion shipped as code",
  },
  {
    slug: "code",
    hash: "code",
    label: "Code",
    title: "Blinn Motion — three lines to motion",
    description:
      "npm i @blinn-motion/react (or vue · svelte · dom · canvas…). Play on a clock or drive with progress 0…1.",
    badge: "USE IT IN CODE",
    subtitle: "npm i @blinn-motion/react — three lines to motion",
    image: "/og/sections/code.png",
    imageAlt: "Blinn Motion code — three lines to play a MotionDoc",
  },
  {
    slug: "compare",
    hash: "compare",
    label: "Compare",
    title: "Blinn Motion — ship the timeline, skip the detour",
    description:
      "Not hand CSS rebuilds. Not baked video. The Figma Motion timeline becomes the file that ships.",
    badge: "WHEN MOTION LIVES IN FIGMA",
    subtitle: "Timeline ships · no CSS rebuild · no video bake",
    image: "/og/sections/compare.png",
    imageAlt: "Blinn Motion vs hand CSS and video export",
  },
];

export function getShareSection(slug: string): ShareSection | undefined {
  return shareSections.find((s) => s.slug === slug);
}

/** Absolute share URL for a section (for copy / tweets). */
export function shareUrl(slug: string, origin = "https://blinnmotion.com"): string {
  return `${origin.replace(/\/$/, "")}/s/${slug}`;
}
