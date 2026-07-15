/**
 * Framework / adapter metadata + inline SVG logos (viewBox 0 0 24 24).
 * Used on the landing page; Figma plugin embeds a parallel set (no shared runtime).
 */
export type FrameworkIconId =
  | "dom"
  | "canvas"
  | "react"
  | "rn"
  | "vue"
  | "svelte"
  | "angular"
  | "lit"
  | "next"
  | "expo"
  | "astro"
  | "json";

/** SVG path content only (no outer <svg>) — fill/stroke use currentColor unless noted. */
export const frameworkIcons: Record<FrameworkIconId, string> = {
  // HTML / CSS stack
  dom: `<path fill="currentColor" d="M4 3h16l-1.5 17L12 22 5.5 20 4 3zm3.1 5.2.3 3.4h6.8l-.2 2.3-2.2.6-2.2-.6-.1-1.4H7.6l.3 2.9L12 17l4.1-1.1.6-6.5H7.1z"/>`,
  // Canvas / artboard
  canvas: `<g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M9 4.5v15"/><circle cx="14.5" cy="14" r="2.2" fill="currentColor" stroke="none"/></g>`,
  // React atom
  react: `<g fill="none" stroke="currentColor" stroke-width="1.25"><ellipse cx="12" cy="12" rx="10" ry="3.8"/><ellipse cx="12" cy="12" rx="10" ry="3.8" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="3.8" transform="rotate(120 12 12)"/></g><circle cx="12" cy="12" r="2" fill="currentColor"/>`,
  // React Native / Expo — phone + orbit (never letter-forms like fake "Ex" → "AI")
  rn: `<g fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2.5" width="8" height="19" rx="2"/><path d="M11 4.5h2M11.2 18.8h1.6"/><ellipse cx="12" cy="11.2" rx="6.5" ry="2.4"/><ellipse cx="12" cy="11.2" rx="6.5" ry="2.4" transform="rotate(60 12 11.2)"/><ellipse cx="12" cy="11.2" rx="6.5" ry="2.4" transform="rotate(120 12 11.2)"/></g><circle cx="12" cy="11.2" r="1.35" fill="currentColor"/>`,
  // Vue V
  vue: `<path fill="currentColor" d="M1.8 3.2h4.4L12 13.6 17.8 3.2h4.4L12 20.8 1.8 3.2zm6.4 0L12 10l3.8-6.8h-2.8L12 6.2 11 3.2H8.2z"/>`,
  // Svelte open loop
  svelte: `<path fill="currentColor" d="M20.5 6.3a5.8 5.8 0 0 0-7.8-2.1L9.5 6.3a4 4 0 0 0-1.7 5.4l.4.7a2.4 2.4 0 0 0 1.4-.2 2 2 0 0 1 2.7.7 2 2 0 0 1 0 1.6l-1.7 2.6a2 2 0 0 1-2.7.7 2 2 0 0 1-1-1.3l-1.9.5a4 4 0 0 0 1.9 2.7 4.2 4.2 0 0 0 5.6-1.5l3.5-5.5a4 4 0 0 0-1.7-5.4 2.4 2.4 0 0 0-1.4.2 2 2 0 0 1-2.7-.7 2 2 0 0 1 0-1.6l1.7-2.6a2 2 0 0 1 2.7-.7c.5.3.8.8 1 1.3l1.9-.5a4 4 0 0 0-1.2-2.1z"/>`,
  // Angular shield
  angular: `<path fill="currentColor" d="M12 2.2 2.8 5.6l1.5 12.6L12 21.8l7.7-3.6 1.5-12.6L12 2.2zm0 3.2 4.8 1.7-.6 4.8H12V5.4zm0 8.3h3.9l-.7 5.4L12 20.5v-6.8zM7.2 7.1 12 5.4v5.8H7.8L7.2 7.1zm.6 6.6H12v6.8l-3.5-1.3-.7-5.5z"/>`,
  // Lit flame
  lit: `<path fill="currentColor" d="M12.8 2.5c.2 2.8-1.5 4.2-3 5.5-1.4 1.2-2.6 2.3-2.6 4.5a5.3 5.3 0 0 0 5.3 5.3c3.2 0 5.5-2.4 5.5-5.8 0-4.2-3.4-6-5.2-9.5zm-.3 14.8a2.8 2.8 0 0 1-2.8-2.8c0-1.4.7-2.2 2-3.4.4 1.4 1.5 1.9 1.5 3.3 0 1.1.4 1.6 1.1 2.2-.5.5-1.1.7-1.8.7z"/>`,
  // Next.js circle + mark
  next: `<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/><path fill="currentColor" d="M9 8h1.8l4 7.2V8H16.5v8h-1.8l-4-7.2V16H9z"/>`,
  // Expo alias — same mobile mark as rn
  expo: `<g fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2.5" width="8" height="19" rx="2"/><path d="M11 4.5h2M11.2 18.8h1.6"/><ellipse cx="12" cy="11.2" rx="6.5" ry="2.4"/><ellipse cx="12" cy="11.2" rx="6.5" ry="2.4" transform="rotate(60 12 11.2)"/><ellipse cx="12" cy="11.2" rx="6.5" ry="2.4" transform="rotate(120 12 11.2)"/></g><circle cx="12" cy="11.2" r="1.35" fill="currentColor"/>`,
  // Astro star
  astro: `<path fill="currentColor" d="M12 2.2 10.1 9.5 2.8 11.4l7.3 1.9L12 21.8l1.9-8.5 7.3-1.9-7.3-1.9L12 2.2zm0 5.6.8 2.8 2.8.8-2.8.8-.8 2.8-.8-2.8-2.8-.8 2.8-.8.8-2.8z"/>`,
  // JSON braces
  json: `<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M8 5.5c-2 0-3 1.2-3 3v1.5c0 1.2-.8 2-2 2 1.2 0 2 .8 2 2V15c0 1.8 1 3 3 3M16 5.5c2 0 3 1.2 3 3v1.5c0 1.2.8 2 2 2-1.2 0-2 .8-2 2V15c0 1.8-1 3-3 3"/>`,
};

export function frameworkSvg(id: FrameworkIconId, size = 20): string {
  const inner = frameworkIcons[id];
  return `<svg class="fw-icon" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${inner}</svg>`;
}

export type FrameworkMeta = {
  id: FrameworkIconId;
  name: string;
  pkg: string;
  c: string;
  tint: string;
  badge: string;
  desc: string;
  code: string;
};

/** Full adapter grid on the landing page. */
export const adapters: FrameworkMeta[] = [
  {
    id: "dom",
    name: "DOM",
    pkg: "@blinn-motion/dom",
    c: "var(--blue)",
    tint: "var(--blue-t)",
    badge: "full fidelity",
    desc: "Full-fidelity CSS adapter — nested divs, gradients, SVG vector paths with arrowheads, clip-path stars, masks and procedural shaders.",
    code: `import { create } from "@blinn-motion/dom";\ncreate(el, doc, { loop: true }).play();`,
  },
  {
    id: "canvas",
    name: "Canvas",
    pkg: "@blinn-motion/canvas",
    c: "var(--cyan)",
    tint: "var(--cyan-t)",
    badge: "zero DOM",
    desc: "A pure-JS 2D canvas painter for the very same resolved tree — one immediate-mode draw per frame, no DOM nodes.",
    code: `import { create } from "@blinn-motion/canvas";\ncreate(el, doc, { loop: true }).play();`,
  },
  {
    id: "react",
    name: "React",
    pkg: "@blinn-motion/react",
    c: "var(--violet)",
    tint: "var(--violet-t)",
    badge: "component + hook",
    desc: "A declarative component and hook. Switch the painter with one prop; play, pause and seek through a ref.",
    code: `<BlinnMotion doc={doc} renderer="canvas" loop autoplay />`,
  },
  {
    id: "rn",
    name: "React Native",
    pkg: "@blinn-motion/react-native",
    c: "var(--coral)",
    tint: "var(--coral-t)",
    badge: "native views",
    desc: "The same timing on native <View> / <Text>. No native module, no Skia dependency — just the shared core maths.",
    code: `<BlinnMotionView doc={doc} loop />`,
  },
  {
    id: "vue",
    name: "Vue",
    pkg: "@blinn-motion/vue",
    c: "#42b883",
    tint: "rgba(66,184,131,.12)",
    badge: "component + composable",
    desc: "Vue 3 component and useBlinnMotion composable — same DOM/Canvas backends and controlled progress surface.",
    code: `<BlinnMotion :doc="doc" renderer="dom" :loop="true" />`,
  },
  {
    id: "svelte",
    name: "Svelte",
    pkg: "@blinn-motion/svelte",
    c: "#ff3e00",
    tint: "rgba(255,62,0,.1)",
    badge: "use:action",
    desc: "Idiomatic Svelte action (use:blinnMotion) plus attachBlinnMotion for full imperative control.",
    code: `<div use:blinnMotion={{ doc, renderer: "canvas" }} />`,
  },
  {
    id: "angular",
    name: "Angular",
    pkg: "@blinn-motion/angular",
    c: "#dd0031",
    tint: "rgba(221,0,49,.1)",
    badge: "standalone component",
    desc: "Standalone <blinn-motion> with inputs for doc, renderer, progress and a frame output.",
    code: `<blinn-motion [doc]="doc" renderer="dom" />`,
  },
  {
    id: "lit",
    name: "Lit",
    pkg: "@blinn-motion/lit",
    c: "#324fff",
    tint: "rgba(50,79,255,.12)",
    badge: "custom element",
    desc: "<blinn-motion> web component — works in any stack that can host custom elements.",
    code: `<blinn-motion .doc=\${doc} renderer="canvas"></blinn-motion>`,
  },
];
