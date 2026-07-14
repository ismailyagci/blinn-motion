# Blinn Motion · React Native example (Expo)

Plays the shared `fixtures/card.motion.json` MotionDoc with **@blinn-motion/react-native**,
which renders @blinn-motion/core's resolved render tree into native `<View>`/`<Text>` nodes.

## Why it's a template

This package is kept lightweight on purpose: the heavy Expo / React Native runtime
deps are **not** installed by the monorepo's `npm install` (so the repo stays fast to
install and the web examples don't drag in the native toolchain).

## Run it

```bash
cd examples/react-native
# install the Expo runtime into this app (one-time)
npx expo install expo expo-status-bar react react-native
# start Metro (workspace resolution is preconfigured in metro.config.js)
npm start          # then press i (iOS), a (Android), or w (web)
```

`metro.config.js` already watches the repo root so Metro resolves the symlinked
`@blinn-motion/*` workspace packages and the shared `/fixtures` folder.

## What to expect

The card scales/fades/springs in, the badge spins and shifts color, the title slides
in — identical timing to the DOM/Canvas/React examples, because every adapter shares
`@blinn-motion/core`'s `sample(doc, t)` render method.

### v1 limitations (React Native backend)

- Linear gradients and vector/polygon paths fall back to a solid color
  (add `react-native-svg` / `expo-linear-gradient` to lift this).
- Transforms apply around the view center, so off-center anchors are approximate;
  centered anchors (`{0.5, 0.5}`) are exact.
- Effects (blur/shadow) are not mapped yet.
