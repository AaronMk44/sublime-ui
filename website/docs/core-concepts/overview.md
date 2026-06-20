---
title: Core Concepts
sidebar_position: 1
---

# Core Concepts

A Sublime UI app is built from two halves: a **shared core** that every platform
uses, and **platform-specific UI** that renders the screens.

The shared core is the part you write **once**: your data models, your theme
tokens, your native/service contracts, and your navigation structure. None of it
is tied to a particular platform. On top of that core, each target supplies its
own UI — web screens render with [MUI](https://mui.com), mobile screens render
with [React Native Paper](https://callstack.github.io/react-native-paper/), and
desktop simply packages the web UI inside an Electron shell.

The slogan is **write the non-UI parts once, run everywhere**. Models, theming,
navigation, and the contracts for native calls live in one place; only the
presentation layer is rewritten per platform — and even that draws from the same
theme and talks to the same models.

## A guide to this section

These concept pages give you the mental model for each piece of the shared core.
Each one links down to the deep docs for full detail:

- **[Models](/docs/framework/overview)** — declare your data once and read/write
  it reactively from any platform.
- **[Storybook (navigation)](/docs/navigation/storybook)** — define your app's
  navigation structure in one shared place.
- **[Native calls](/docs/desktop/native-bridge)** — a typed contract for calling
  OS and Node capabilities.
- **[Theming](/docs/mobile/theming)** — shared design tokens that both UI layers
  consume.
- **[Components](/components/overview)** — the cross-platform component library your
  screens are built from.

A **Services** concept (your custom business logic) is also part of the shared
core — that page is coming soon.

For the concrete folder layout that holds all of this, see
[project structure](/docs/framework/project-structure).
