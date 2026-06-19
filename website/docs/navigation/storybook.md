---
sidebar_position: 1
title: Storybook Navigation
---

# Storybook Navigation

Sublime UI describes navigation as a **storybook**, then compiles it — ahead of
time — into the idiomatic router for each platform: React Navigation on mobile,
react-router on web. You never hand-write platform routing.

## The model

- A **Book** is a navigator. It has a **print format** that decides how its pages
  are presented.
- A **Page** is a screen. One page follows another.
- A book can **link** to another book — a nested navigator.

Books are authored **separately per platform**, because mobile and web navigation
are genuinely different shapes. The mobile book references mobile screens and
mobile formats; the web book references web screens and web formats.

### Print formats

Formats are a validated string union per platform — an invalid value is a type
error.

| Platform | Formats |
| --- | --- |
| Mobile | `drawer` · `stack` · `bottomNav` (max 5 pages) |
| Web | `sidebar` · `stack` · `tabs` |

## Authoring

```ts
// src/navigation/storybook.native.ts  (mobile)
import { book, page, link } from '@sublime-ui/ui/navigation';
import { Home } from '../screens/mobile/Home';
import { ProductDetail } from '../screens/mobile/ProductDetail';
import { settingsBook } from './settings.native';

export default book({
  format: 'bottomNav',
  pages: {
    home: page(Home, { title: 'Home', icon: 'home' }),
    product: page<{ id: number }>(ProductDetail, { title: 'Product' }),
    settings: link(settingsBook, { title: 'Settings', icon: 'cog' }),
  },
});
```

The web book has the same shape, pointing at `../screens/web/*` with a web format
such as `sidebar`.

## Navigating

One typed hook, everywhere:

```ts
const nav = useNav();
nav.turnTo('product', { id: 1 }); // params required because the page declared them
nav.turnBack();
```

`turnTo` is checked against a generated route map: an unknown page name is a type
error, and params are required exactly when the target page declares them.

## Compiling

A devkit step turns each storybook into platform artifacts:

```bash
sublime build:nav
```

It emits `navigation.native.tsx` (React Navigation), `navigation.web.tsx`
(react-router), and `routes.d.ts` (the typed route map). The platform-resolved
`<Navigation>` is what your app mounts. Validation runs here too — a 6-page
`bottomNav`, a duplicate page key, or a dangling link fails the build with a clear
message.

## Layout primitives

Screens compose from a small, platform-resolved set: `Screen`, `Stack`, `Row`,
`Spacer` — so a screen's structure reads the same on every platform while
rendering with native primitives underneath.
