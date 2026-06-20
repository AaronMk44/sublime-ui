---
title: Components
sidebar_position: 7
---

# Components

A Sublime UI component is one idea — a `Card`, a `Button` — that knows how to
draw itself on every platform. You reach for the same component everywhere; the
right implementation is chosen for you at build time. There's no webview and no
custom render engine: the web component paints with real MUI, and the mobile
component paints with React Native Paper.

## A component is a quartet

Each component is authored as four files that travel together inside
`library/src/components/<Name>/`:

- `<Name>.types.ts` — the **shared** props interface both platforms satisfy.
- `<Name>.tsx` — the **web** implementation (MUI).
- `<Name>.native.tsx` — the **mobile** implementation (Paper).
- `index.ts` — the export barrel.

You never import these files individually. You write
`import { Card } from '@sublime-ui/library'`, and the bundler resolves `.tsx` on
web or `.native.tsx` on mobile. Because both implementations satisfy the same
`.types.ts`, the prop names and types are identical on every platform — you
write against one component and one props type.

## One component, a screen per platform

The split that matters in Sublime is per *screen*, not per *component*. You may
write a web screen and a native screen for a given route, but inside both you
reach for the same shared `Card`, `Button`, and friends. The component layer is
where cross-platform consistency lives, so a screen stays small and only
expresses what's genuinely platform-specific.

## Go deeper

The **[Components catalog](/components/overview)** is the per-component reference: one
page each, with props, defaults, and runnable `tsx` examples. For the model
behind the whole library — tokens, theming, and `<SublimeProvider>` — see the
**[Library overview](/docs/library/overview)**.
