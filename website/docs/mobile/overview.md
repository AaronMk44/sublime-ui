---
sidebar_position: 1
title: Overview
---

# Mobile

The mobile target runs your app natively on Android with **React Native** and
**[React Native Paper](https://callstack.github.io/react-native-paper/)**. Unlike
desktop — which packages the *web* UI inside an Electron shell — mobile is a real
second UI family: it has its own screens, its own navigation, and its own
Paper-themed components, all driven from the same shared models and design tokens.

Mobile and web are the two UI families a Sublime app ships; desktop reuses the web
one. See [project structure](../framework/project-structure.md) for how shared core
and per-platform screens sit together.

## Where mobile lives

Everything mobile-specific is platform-suffixed so the bundler resolves it
correctly on React Native:

```
src/
  screens/mobile/         # mobile screens — *.native.tsx
  navigation/
    storybook.native.ts   # the mobile navigation book you author
    navigation.native.tsx # generated React Navigation tree (don't edit)
mobile/                   # the React Native entry that mounts <Navigation>
```

- **Screens** live in `src/screens/mobile/` as `*.native.tsx`. A mobile screen and
  its web counterpart are different files with different layouts, but they reach
  for the **same shared `<Card>` / `<Button>` components and the same models**.
- **Navigation** is authored in `src/navigation/storybook.native.ts` and compiled
  to `navigation.native.tsx`.
- The **`mobile/`** folder is the React Native entry point that mounts the
  generated `<Navigation>`.

## Shared core, native skin

What's shared and what's mobile-specific:

- **Shared:** models, design tokens, native service *contracts*, and your
  cross-platform components (each component is a quartet — types, web, native,
  index).
- **Mobile-specific:** every `*.native.tsx` screen and the `storybook.native.ts`
  navigation book.

Because components are platform-resolved, a screen built from `Screen`, `Stack`,
`Row`, and `Spacer` reads the same on every platform but renders with native
primitives underneath.

## Navigation compiles to React Navigation

You never hand-write React Navigation. You author a **storybook** — a typed
description of books (navigators) and pages (screens) — and `sublime build:nav`
compiles it ahead of time into the idiomatic router for each platform: React
Navigation on mobile, react-router on web.

The mobile book references mobile screens and uses **mobile formats**:

| Format | Presents as |
| --- | --- |
| `bottomNav` | A bottom tab bar (**max 5 pages**) |
| `drawer` | A side drawer |
| `stack` | A push/pop stack |

A scaffolded app ships a `bottomNav` book:

```ts
// src/navigation/storybook.native.ts
import { book, page, link } from '@sublime-ui/ui/navigation';
import { Home } from '../screens/mobile/Home';
import { ProductDetail } from '../screens/mobile/ProductDetail';

export default book({
  format: 'bottomNav',
  pages: {
    home: page(Home, { title: 'Home', icon: 'home' }),
    product: page<{ id: number }>(ProductDetail, { title: 'Product' }),
  },
});
```

`build:nav` emits `navigation.native.tsx` (the React Navigation tree) plus the
typed route map, and validates as it goes — a 6-page `bottomNav`, a web format in
a native book, or a dangling link fails the build with a clear message. Navigating
is one typed hook everywhere: `nav.turnTo('product', { id: 1 })`.

The same hook, the same `<Card>`, the same model — a different, native screen.
Read more in [Storybook Navigation](../navigation/storybook.md).

## Next

- [Running the mobile app](./running.md) — `sublime doctor`, `dev:mobile`, and
  devices.
- [Building for Android](./building.md) — the offline APK / AAB build.
- [Theming on mobile](./theming.md) — how tokens drive the Paper theme.
