---
slug: /
sidebar_position: 1
title: Introduction
---

# Sublime UI

**Sublime UI** is a TypeScript-only framework for building cross-platform
applications. You write the non-UI parts of your app **once** — models, business
logic, design tokens, native capabilities — and run them on **mobile, web, and
desktop**.

The UI itself stays platform-native: mobile screens are React Native + Paper, web
screens are React + MUI, and desktop packages the web UI inside Electron. Only the
**design-system components** (`Card`, `Button`, …) and the **app core** are shared.

## The pieces

| Package | What it gives you |
| --- | --- |
| `@sublime-ui/framework` | Model-centric data layer (Laravel-style models over Redux Toolkit + a pluggable Gateway). |
| `@sublime-ui/library` | A tokens-first design system: themeable, cross-platform components. |
| `@sublime-ui/ui` | Navigation ("storybooks") + layout primitives (`Screen`, `Stack`, `Row`, `Spacer`). |
| `@sublime-ui/desktop` | Electron shell + a typed native bridge for calling Node/OS from your app. |
| `@sublime-ui/devkit` | The `sublime` CLI: scaffolding, code generators, builds, and packaging. |

## What makes it different

- **One model, many platforms.** Define a `Model` once; it works the same on every
  target.
- **Platform-native UI, shared building blocks.** No lowest-common-denominator
  widgets — real MUI on web, real Paper on mobile, sharing tokens and components.
- **Compile-time over runtime.** Navigation and the native bridge are generated/
  validated ahead of time, so you get full types and idiomatic output per platform.

> These docs are written alongside the framework's design. Each section captures
> the decisions behind a capability, not just its API.
