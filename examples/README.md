# Blinn Motion examples

Every app here follows the **same advanced demo flow** so you can switch stacks without relearning controls.

See [`_shared/flow.md`](./_shared/flow.md) for the checklist of cases.

| Example | Stack | Adapter |
|---------|--------|---------|
| [`vanilla`](./vanilla) | Vite + TypeScript | `@blinn-motion/dom` + `@blinn-motion/canvas` |
| [`react`](./react) | React + Vite | `@blinn-motion/react` |
| [`react-native`](./react-native) | Expo RN | `@blinn-motion/react-native` |
| [`vue`](./vue) | Vue 3 + Vite | `@blinn-motion/vue` |
| [`svelte`](./svelte) | Svelte 5 + Vite | `@blinn-motion/svelte` |
| [`angular`](./angular) | Angular 19 + Vite | `@blinn-motion/angular` |
| [`lit`](./lit) | Lit 3 + Vite | `@blinn-motion/lit` |
| [`next`](./next) | Next.js App Router | `@blinn-motion/react` (client) |
| [`astro`](./astro) | Astro islands | React + Lit adapters |
| [`expo`](./expo) | Expo | `@blinn-motion/react-native` |

Shared chrome: [`_shared/demo.css`](./_shared/demo.css), fixtures via [`_shared/fixtures.ts`](./_shared/fixtures.ts) (or direct JSON imports for Next/Astro/Expo).

```bash
# from repo root after npm install && npm run build
npm run dev --workspace @blinn-motion/example-vue
npm run build --workspace @blinn-motion/example-lit
```
