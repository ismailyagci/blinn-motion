import type { FrameworkIconId } from "./frameworks";

/** Live Cloudflare Pages labs — production builds use published @blinn-motion/* from npm. */
export type LiveExample = {
  id: string;
  name: string;
  stack: string;
  desc: string;
  href: string;
  icon: FrameworkIconId;
  c: string;
  tint: string;
  flagship?: boolean;
};

export const liveExamples: LiveExample[] = [
  {
    id: "react",
    name: "React",
    stack: "Vite · @blinn-motion/react",
    desc: "Flagship lab — dual DOM/Canvas stages, transport, scrub, rate, progress mode.",
    href: "https://react.blinnmotion.com",
    icon: "react",
    c: "var(--violet)",
    tint: "var(--violet-t)",
    flagship: true,
  },
  {
    id: "vanilla",
    name: "Vanilla",
    stack: "Vite · DOM + Canvas",
    desc: "No framework — pure @blinn-motion/dom and canvas adapters side by side.",
    href: "https://vanilla.blinnmotion.com",
    icon: "dom",
    c: "var(--blue)",
    tint: "var(--blue-t)",
  },
  {
    id: "vue",
    name: "Vue",
    stack: "Vue 3 · @blinn-motion/vue",
    desc: "Component + composable with the same dual-stage director lab.",
    href: "https://vue.blinnmotion.com",
    icon: "vue",
    c: "#42b883",
    tint: "rgba(66,184,131,.12)",
  },
  {
    id: "svelte",
    name: "Svelte",
    stack: "Svelte 5 · @blinn-motion/svelte",
    desc: "use:blinnMotion action and attach API in the full lab shell.",
    href: "https://svelte.blinnmotion.com",
    icon: "svelte",
    c: "#ff3e00",
    tint: "rgba(255,62,0,.1)",
  },
  {
    id: "angular",
    name: "Angular",
    stack: "Angular 19 · @blinn-motion/angular",
    desc: "Standalone <blinn-motion> with controlled progress and dual stages.",
    href: "https://angular.blinnmotion.com",
    icon: "angular",
    c: "#dd0031",
    tint: "rgba(221,0,49,.1)",
  },
  {
    id: "lit",
    name: "Lit",
    stack: "Lit 3 · @blinn-motion/lit",
    desc: "Web component lab — drop into any host that supports custom elements.",
    href: "https://lit.blinnmotion.com",
    icon: "lit",
    c: "#324fff",
    tint: "rgba(50,79,255,.12)",
  },
  {
    id: "next",
    name: "Next.js",
    stack: "App Router · React adapter",
    desc: "Static-exported Next app using @blinn-motion/react client components.",
    href: "https://next.blinnmotion.com",
    icon: "next",
    c: "var(--ink)",
    tint: "var(--paper-3)",
  },
  {
    id: "astro",
    name: "Astro",
    stack: "Islands · React + Lit",
    desc: "Static Astro shell with React and Lit client islands sharing MotionDocs.",
    href: "https://astro.blinnmotion.com",
    icon: "astro",
    c: "#ff5d01",
    tint: "rgba(255,93,1,.1)",
  },
];
