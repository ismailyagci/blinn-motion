# @blinn-motion/svelte

[![npm](https://img.shields.io/npm/v/@blinn-motion/svelte.svg)](https://www.npmjs.com/package/@blinn-motion/svelte)
[![license](https://img.shields.io/npm/l/@blinn-motion/svelte.svg)](https://github.com/ismailyagci/blinn-motion/blob/main/LICENSE)

**Svelte adapter for [Blinn Motion](https://blinnmotion.com)** — idiomatic `use:blinnMotion` action plus a pure attach helper. Same MotionDoc engine as every other adapter.

Works with **Svelte 4 and 5**.

## Install

```bash
npm install @blinn-motion/svelte
# peer: svelte
```

## Quick start

```svelte
<script lang="ts">
  import { blinnMotion } from "@blinn-motion/svelte";
  import doc from "./card.motion.json";
</script>

<div
  use:blinnMotion={{
    doc,
    renderer: "dom",
    loop: true,
    autoplay: true,
  }}
  style="width:375px;height:600px"
></div>
```

## Live demo

[svelte.blinnmotion.com](https://svelte.blinnmotion.com)

## Action params

```ts
type BlinnMotionActionParams = {
  doc: MotionDoc;
  renderer?: "dom" | "canvas"; // default "dom"
  loop?: boolean;
  autoplay?: boolean;
  rate?: number;
  /** Controlled 0…1 — disables clock autoplay while set */
  progress?: number;
  onFrame?: (time: number, fraction: number) => void;
};
```

Update params reactively; the action remounts/updates as needed.

### Controlled progress

```svelte
<script>
  import { blinnMotion } from "@blinn-motion/svelte";
  import doc from "./card.motion.json";
  let progress = $state(0);
</script>

<div use:blinnMotion={{ doc, progress }} style="width:375px;height:600px"></div>
<input type="range" min="0" max="1" step="0.001" bind:value={progress} />
```

## Imperative handle

```svelte
<script lang="ts">
  import { blinnMotion, getBlinnHandle } from "@blinn-motion/svelte";
  import doc from "./card.motion.json";

  let el: HTMLDivElement;

  function play() {
    getBlinnHandle(el)?.play();
  }
</script>

<div bind:this={el} use:blinnMotion={{ doc, autoplay: false }}></div>
<button on:click={play}>Play</button>
```

Handle: `play` · `pause` · `stop` · `toggle` · `seek` · `seekFraction` · `setProgress` · `setRate`

## `attachBlinnMotion`

```ts
import { attachBlinnMotion } from "@blinn-motion/svelte";

const attached = attachBlinnMotion(node, { doc, renderer: "canvas" });
attached.setControlledProgress(0.4);
attached.dispose();
```

## Docs

- [Svelte adapter](https://docs.blinnmotion.com/adapters/svelte)
- [Playback](https://docs.blinnmotion.com/guides/playback)
- [GitHub](https://github.com/ismailyagci/blinn-motion)

## License

MIT © Blinn Motion
