/** Minimal drop-in snippets shown on each live example lab. */

export type StackId =
  | "vanilla"
  | "react"
  | "vue"
  | "svelte"
  | "angular"
  | "lit"
  | "next"
  | "astro";

export type Snippet = {
  id: StackId;
  title: string;
  packageName: string;
  install: string;
  docs: string;
  /** Short label for the code tab */
  file: string;
  code: string;
};

export const snippets: Record<StackId, Snippet> = {
  vanilla: {
    id: "vanilla",
    title: "DOM / Canvas",
    packageName: "@blinn-motion/dom",
    install: "npm i @blinn-motion/dom @blinn-motion/canvas",
    docs: "https://docs.blinnmotion.com/adapters/dom",
    file: "main.ts",
    code: `import { create } from "@blinn-motion/dom";
import doc from "./card.motion.json";

const player = create(
  document.getElementById("stage")!,
  doc,
  { loop: true, autoplay: true },
);

// player.pause() · player.seek(0.5) · player.setProgress(0.3)
// Canvas: import { create } from "@blinn-motion/canvas"`,
  },
  react: {
    id: "react",
    title: "React",
    packageName: "@blinn-motion/react",
    install: "npm i @blinn-motion/react",
    docs: "https://docs.blinnmotion.com/adapters/react",
    file: "App.tsx",
    code: `import { BlinnMotion } from "@blinn-motion/react";
import doc from "./card.motion.json";

export function Hero() {
  return (
    <BlinnMotion
      doc={doc}
      renderer="dom"   // or "canvas"
      loop
      autoplay
    />
  );
}

// Controlled: <BlinnMotion doc={doc} progress={scrollP} />
// Imperative: ref → player.play() / seek() / setProgress()`,
  },
  vue: {
    id: "vue",
    title: "Vue",
    packageName: "@blinn-motion/vue",
    install: "npm i @blinn-motion/vue",
    docs: "https://docs.blinnmotion.com/adapters/vue",
    file: "App.vue",
    code: `<script setup lang="ts">
import { BlinnMotion } from "@blinn-motion/vue";
import doc from "./card.motion.json";
</script>

<template>
  <BlinnMotion
    :doc="doc"
    renderer="dom"
    :loop="true"
    :autoplay="true"
  />
  <!-- Controlled: :progress="scrollP" -->
</template>`,
  },
  svelte: {
    id: "svelte",
    title: "Svelte",
    packageName: "@blinn-motion/svelte",
    install: "npm i @blinn-motion/svelte",
    docs: "https://docs.blinnmotion.com/adapters/svelte",
    file: "App.svelte",
    code: `<script lang="ts">
  import { blinnMotion } from "@blinn-motion/svelte";
  import doc from "./card.motion.json";
</script>

<div
  use:blinnMotion={{
    doc,
    renderer: "canvas",
    loop: true,
    autoplay: true,
  }}
></div>

<!-- Or attachBlinnMotion(node, { doc }) for full control -->`,
  },
  angular: {
    id: "angular",
    title: "Angular",
    packageName: "@blinn-motion/angular",
    install: "npm i @blinn-motion/angular",
    docs: "https://docs.blinnmotion.com/adapters/angular",
    file: "app.component.ts",
    code: `import { BlinnMotionComponent } from "@blinn-motion/angular";
import doc from "./card.motion.json";

@Component({
  standalone: true,
  imports: [BlinnMotionComponent],
  template: \`
    <blinn-motion
      [doc]="doc"
      renderer="dom"
      [loop]="true"
      [autoplay]="true"
    />
  \`,
})
export class AppComponent {
  doc = doc;
}`,
  },
  lit: {
    id: "lit",
    title: "Lit",
    packageName: "@blinn-motion/lit",
    install: "npm i @blinn-motion/lit",
    docs: "https://docs.blinnmotion.com/adapters/lit",
    file: "app.ts",
    code: `import { defineBlinnMotionElement } from "@blinn-motion/lit";
import doc from "./card.motion.json";

defineBlinnMotionElement(); // registers <blinn-motion>

const el = document.createElement("blinn-motion");
el.doc = doc;
el.renderer = "canvas";
el.loop = true;
el.autoplay = true;
document.body.append(el);`,
  },
  next: {
    id: "next",
    title: "Next.js",
    packageName: "@blinn-motion/react",
    install: "npm i @blinn-motion/react",
    docs: "https://docs.blinnmotion.com/adapters/react",
    file: "components/Hero.tsx",
    code: `"use client";

import { BlinnMotion } from "@blinn-motion/react";
import doc from "./card.motion.json";

export function Hero() {
  return (
    <BlinnMotion
      doc={doc}
      renderer="dom"
      loop
      autoplay
    />
  );
}

// App Router: keep the player in a Client Component ("use client").`,
  },
  astro: {
    id: "astro",
    title: "Astro islands",
    packageName: "@blinn-motion/react",
    install: "npm i @blinn-motion/react @blinn-motion/lit",
    docs: "https://docs.blinnmotion.com/adapters/react",
    file: "pages/index.astro",
    code: `---
// React island
import { MotionIsland } from "../components/MotionIsland";
---
<MotionIsland client:load />

// components/MotionIsland.tsx
import { BlinnMotion } from "@blinn-motion/react";
import doc from "./card.motion.json";

export function MotionIsland() {
  return <BlinnMotion doc={doc} renderer="dom" loop autoplay />;
}

// Lit: defineBlinnMotionElement() in a client script, then <blinn-motion>.`,
  },
};
