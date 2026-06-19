---
sidebar_position: 1
title: Cookbook
---

# Cookbook

You already know how to build apps. This section is about *translation* — mapping
the concepts you already use in another framework onto how Sublime UI does the same
job, so you can be productive without relearning everything from scratch.

Sublime UI is a TypeScript-only framework for building one app that runs on
**mobile, web, and desktop**. The parts that don't draw pixels — your data models,
business logic, design tokens, native capabilities — are written **once**. The UI
stays platform-native: React Native + [Paper](https://callstack.github.io/react-native-paper/)
on mobile, React + [MUI](https://mui.com/) on web, and the web UI packaged in
Electron on desktop.

These pages are honest about tradeoffs. Every framework below is excellent at what
it was built for, and several have ecosystems far larger and more battle-tested than
Sublime's. The goal here is to help you decide *where* Sublime's particular bet —
real native UI libraries, a shared model layer, and compile-time navigation/native
bridges — fits your project, and where it doesn't.

## High-level concept map

| Concept | React Native / Expo | Flutter | Web (React / Next.js) | Sublime UI |
| --- | --- | --- | --- | --- |
| **Language** | TypeScript / JS | Dart | TypeScript / JS | TypeScript only |
| **UI rendering** | Native widgets via RN | Flutter's own engine (Skia/Impeller) | DOM | Real native libraries: MUI (web), Paper (mobile); desktop reuses the web UI |
| **Components** | RN core / Paper / your own | Widgets | React components | Tokens-first `@sublime-ui/library`, resolved per platform by filename |
| **Data layer** | Manual `fetch` / Redux / TanStack Query | `http` / Riverpod / Bloc | `fetch` / Redux / server components | `Model` classes (Eloquent-style) over Redux Toolkit + a Gateway |
| **Navigation** | React Navigation / Expo Router | Navigator / `go_router` | React Router / file routing | Compile-time "storybooks" → generated React Navigation (mobile) + React Router (web), with a typed route map |
| **Native access** | Native modules / Expo modules | Platform channels | (browser APIs only) | `defineNative` / `useNative` typed bridge (desktop) |
| **Cross-platform reach** | iOS + Android (+ web via RN Web) | iOS + Android + web + desktop | Web (and native via wrappers) | iOS + Android + web + desktop from one model & component set |

A few words on what those rows mean in practice:

- **"Real native libraries"** — Sublime does not ship its own rendering engine and
  does not run your UI in a webview. On the web you get genuine MUI components and
  the real DOM; on mobile you get genuine Paper components and native views. The
  shared layer is the *design system* (`Card`, `Button`, …) and the *app core*,
  not the rendered widgets.
- **"Compile-time"** — navigation and the native bridge are generated and
  type-checked ahead of time (`sublime build:nav`). You get full TypeScript types
  and idiomatic per-platform output rather than a runtime abstraction.

## Pick your starting point

- **[Coming from React Native / Expo](./coming-from-react-native.md)** — you know
  RN components and React Navigation; see where the Model layer, true web/desktop
  parity, and typed navigation fit.
- **[Coming from Flutter](./coming-from-flutter.md)** — you know Dart, widgets, and
  platform channels; see the tradeoffs of staying in TypeScript on real native UI
  libraries.
- **[Coming from React / Next.js (web)](./coming-from-web.md)** — you already know
  React and TypeScript; see how Sublime adds real mobile + desktop from the same
  model and components.
