# Blinn Motion · Example lab

Each app is a **director-style lab**, not a bare sandbox: dual stages (web), transport console,
scrub, rate, clock vs progress mode, and a covered-cases grid.

Shared chrome: [`_shared/lab.css`](./_shared/lab.css) · flow contract: [`_shared/flow.md`](./_shared/flow.md)

| Example | Stack | Adapter |
|---------|--------|---------|
| [`vanilla`](./vanilla) | Vite + TypeScript | `@blinn-motion/dom` + `canvas` |
| [`react`](./react) | React + Vite | `@blinn-motion/react` **(flagship UI)** |
| [`vue`](./vue) | Vue 3 | `@blinn-motion/vue` |
| [`svelte`](./svelte) | Svelte 5 | `@blinn-motion/svelte` |
| [`angular`](./angular) | Angular 19 | `@blinn-motion/angular` |
| [`lit`](./lit) | Lit 3 | `@blinn-motion/lit` |
| [`next`](./next) | Next.js App Router | React (client) |
| [`astro`](./astro) | Astro islands | React + Lit |
| [`expo`](./expo) | Expo | `@blinn-motion/react-native` |
| [`react-native`](./react-native) | RN (legacy simpler) | `@blinn-motion/react-native` |

```bash
# from repo root
npm install && npm run build
npm run dev --workspace @blinn-motion/example-react
# → http://localhost:5173 (or next free port)
```
