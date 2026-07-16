# @blinn-motion/vue

[![npm](https://img.shields.io/npm/v/@blinn-motion/vue.svg)](https://www.npmjs.com/package/@blinn-motion/vue)
[![license](https://img.shields.io/npm/l/@blinn-motion/vue.svg)](https://github.com/ismailyagci/blinn-motion/blob/main/LICENSE)

**Vue 3 adapter for [Blinn Motion](https://blinnmotion.com)** — component, composable, and low-level attach helper. Same MotionDoc + `sample(doc, t)` pipeline as React, Svelte, and vanilla.

## Install

```bash
npm install @blinn-motion/vue
# peer: vue ^3
```

## Quick start

```vue
<script setup lang="ts">
import { BlinnMotion } from "@blinn-motion/vue";
import doc from "./card.motion.json";
</script>

<template>
  <BlinnMotion
    :doc="doc"
    renderer="dom"
    :loop="true"
    :autoplay="true"
    :style="{ width: '375px', height: '600px' }"
  />
</template>
```

## Live demo

[vue.blinnmotion.com](https://vue.blinnmotion.com)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `doc` | `MotionDoc` | required | Motion document |
| `renderer` | `"dom" \| "canvas"` | `"dom"` | Backend |
| `loop` | `boolean` | `true` | Loop |
| `autoplay` | `boolean` | `true` | Play on mount |
| `rate` | `number` | `1` | Speed |
| `progress` | `number` | — | Controlled `0…1` |
| `onFrame` | `(time, fraction) => void` | — | Frame callback |
| `className` / `style` | | | Host element |

## Template ref (imperative)

```vue
<script setup lang="ts">
import { ref } from "vue";
import { BlinnMotion, type BlinnMotionHandle } from "@blinn-motion/vue";
import doc from "./card.motion.json";

const motion = ref<BlinnMotionHandle | null>(null);
</script>

<template>
  <BlinnMotion ref="motion" :doc="doc" :autoplay="false" />
  <button @click="motion?.play()">Play</button>
  <button @click="motion?.setProgress(0.5)">Half</button>
</template>
```

Handle: `play` · `pause` · `stop` · `toggle` · `seek` · `seekFraction` · `setProgress` · `setRate`

## Controlled progress

```vue
<script setup>
import { ref } from "vue";
import { BlinnMotion } from "@blinn-motion/vue";
import doc from "./card.motion.json";

const progress = ref(0);
// bind progress from scroll / scrubber
</script>

<template>
  <BlinnMotion :doc="doc" :progress="progress" />
  <input v-model.number="progress" type="range" min="0" max="1" step="0.001" />
</template>
```

## Composable: `useBlinnMotion`

```ts
import { ref, onMounted } from "vue";
import { useBlinnMotion } from "@blinn-motion/vue";
import doc from "./card.motion.json";

const host = ref<HTMLElement | null>(null);
const { controls } = useBlinnMotion(host, doc, { renderer: "canvas", autoplay: true });
```

## Low-level: `attachBlinnMotion`

Framework-agnostic mount (tests, custom hosts):

```ts
import { attachBlinnMotion } from "@blinn-motion/vue";

const attached = attachBlinnMotion(el, { doc, renderer: "dom", autoplay: true });
attached.play();
attached.dispose();
```

## Docs

- [Vue adapter](https://docs.blinnmotion.com/adapters/vue)
- [Playback](https://docs.blinnmotion.com/guides/playback)
- [Landing](https://blinnmotion.com) · [GitHub](https://github.com/ismailyagci/blinn-motion)

## License

MIT © Blinn Motion
