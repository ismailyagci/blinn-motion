# Shared advanced demo flow

Every framework example under `examples/` implements the same cases so users learn one mental model:

1. **Stack badge** — plain-language label (Vue / Svelte / Angular / Lit / Next.js / Expo / Astro)
2. **MotionDoc switch** — at least `card` + `showcase` fixtures
3. **Dual stages (web)** — DOM and Canvas side-by-side (Expo: single native stage)
4. **Transport** — play / pause / toggle, restart, scrub/seek, playback rate
5. **Progress-driven mode** — external 0..1 drive (disables clock autoplay)
6. **Live feedback** — time + fraction from `onFrame` / frame events
7. **Case checklist UI** — visible list of covered controls so the flow is obvious
