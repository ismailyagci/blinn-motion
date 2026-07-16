# @blinn-motion/angular

[![npm](https://img.shields.io/npm/v/@blinn-motion/angular.svg)](https://www.npmjs.com/package/@blinn-motion/angular)
[![license](https://img.shields.io/npm/l/@blinn-motion/angular.svg)](https://github.com/ismailyagci/blinn-motion/blob/main/LICENSE)

**Angular adapter for [Blinn Motion](https://blinnmotion.com)** — standalone `<blinn-motion>` component and a pure attach helper. Same MotionDoc + core render method as React, Vue, and DOM.

Requires **Angular 17+** (standalone APIs). Tested with Angular 19.

## Install

```bash
npm install @blinn-motion/angular
# peers: @angular/core (and your app's Angular version)
```

## Quick start

```ts
import { Component } from "@angular/core";
import { BlinnMotionComponent } from "@blinn-motion/angular";
import doc from "./card.motion.json";

@Component({
  selector: "app-hero",
  standalone: true,
  imports: [BlinnMotionComponent],
  template: `
    <blinn-motion
      [doc]="doc"
      renderer="dom"
      [loop]="true"
      [autoplay]="true"
      [style]="{ width: '375px', height: '600px' }"
      (frame)="onFrame($event)"
    />
  `,
})
export class HeroComponent {
  doc = doc;
  onFrame(e: { time: number; fraction: number }) {
    // live meter
  }
}
```

## Live demo

[angular.blinnmotion.com](https://angular.blinnmotion.com)

## Inputs / outputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `doc` | `MotionDoc` | required | Motion document |
| `renderer` | `"dom" \| "canvas"` | `"dom"` | Backend |
| `loop` | `boolean` | `true` | Loop |
| `autoplay` | `boolean` | `true` | Play on mount |
| `rate` | `number` | `1` | Speed |
| `progress` | `number` | — | Controlled `0…1` |
| `className` / `style` | | | Host styling |

| Output | Payload |
|--------|---------|
| `frame` | `{ time: number; fraction: number }` |

## Imperative API (`ViewChild`)

The component implements the same handle as other adapters:

```ts
import { ViewChild } from "@angular/core";
import { BlinnMotionComponent } from "@blinn-motion/angular";

@ViewChild(BlinnMotionComponent) motion!: BlinnMotionComponent;

// this.motion.play()
// this.motion.pause()
// this.motion.seek(0.5)
// this.motion.seekFraction(0.25)
// this.motion.setProgress(0.1)
// this.motion.setRate(2)
// this.motion.toggle()
// this.motion.stop()
```

## Controlled progress

```html
<blinn-motion [doc]="doc" [progress]="p" />
<input type="range" min="0" max="1" step="0.001" [value]="p" (input)="p = +$any($event.target).value" />
```

While `progress` is set, playback is progress-driven (autoplay off).

## `attachBlinnMotion`

For tests or non-component hosts:

```ts
import { attachBlinnMotion } from "@blinn-motion/angular";

const attached = attachBlinnMotion(hostEl, {
  doc,
  renderer: "canvas",
  autoplay: true,
});
attached.dispose();
```

## Docs

- [Angular adapter](https://docs.blinnmotion.com/adapters/angular)
- [Playback](https://docs.blinnmotion.com/guides/playback)
- [GitHub](https://github.com/ismailyagci/blinn-motion)

## License

MIT © Blinn Motion
