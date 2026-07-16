# Blinn Motion · Example lab

Each app is a **director-style lab**, not a bare sandbox: dual stages (web), transport console,
scrub, rate, clock vs progress mode, and a covered-cases grid.

Shared chrome: [`_shared/lab.css`](./_shared/lab.css) · flow contract: [`_shared/flow.md`](./_shared/flow.md)

## Live demos (Cloudflare Pages)

Production builds install **published** `@blinn-motion/*` from npm (not monorepo `packages/`).
CI: [Deploy examples](../.github/workflows/deploy-examples.yml).

| Example | Stack | Adapter | Live |
|---------|--------|---------|------|
| [`vanilla`](./vanilla) | Vite + TypeScript | `@blinn-motion/dom` + `canvas` | [vanilla.blinnmotion.com](https://vanilla.blinnmotion.com) |
| [`react`](./react) | React + Vite | `@blinn-motion/react` **(flagship UI)** | [react.blinnmotion.com](https://react.blinnmotion.com) |
| [`vue`](./vue) | Vue 3 | `@blinn-motion/vue` | [vue.blinnmotion.com](https://vue.blinnmotion.com) |
| [`svelte`](./svelte) | Svelte 5 | `@blinn-motion/svelte` | [svelte.blinnmotion.com](https://svelte.blinnmotion.com) |
| [`angular`](./angular) | Angular 19 | `@blinn-motion/angular` | [angular.blinnmotion.com](https://angular.blinnmotion.com) |
| [`lit`](./lit) | Lit 3 | `@blinn-motion/lit` | [lit.blinnmotion.com](https://lit.blinnmotion.com) |
| [`next`](./next) | Next.js static export | React (client) | [next.blinnmotion.com](https://next.blinnmotion.com) |
| [`astro`](./astro) | Astro islands | React + Lit | [astro.blinnmotion.com](https://astro.blinnmotion.com) |
| [`expo`](./expo) | Expo | `@blinn-motion/react-native` | — (native) |
| [`react-native`](./react-native) | RN (legacy simpler) | `@blinn-motion/react-native` | — (native) |

```bash
# from repo root (local monorepo — workspace packages / source aliases)
npm install && npm run build
npm run dev --workspace @blinn-motion/example-react
# → http://localhost:5173 (or next free port)
```
