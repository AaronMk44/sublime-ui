---
sidebar_position: 1
title: Installation
---

# Installation

Sublime UI is a TypeScript-only framework. You bring Node and the `sublime` CLI;
Sublime brings the model layer, the design system, navigation, and the native
bridge — shared across mobile, web, and desktop.

## Prerequisites

- **Node.js >= 18** — required by the toolchain.
- **The `sublime` CLI**, shipped by `@sublime-ui/devkit`. This is your entry
  point for scaffolding, code generation, builds, and packaging.

You can use the CLI without a global install via `npx`:

```bash
npx @sublime-ui/devkit doctor
```

`sublime doctor` checks your environment (Node version, platform toolchains) and
tells you what's missing before you build.

## The package set

A Sublime app is composed from a small set of focused packages:

| Package | What it gives you |
| --- | --- |
| `@sublime-ui/framework` | Model-centric data layer — Laravel/Eloquent-style models over Redux Toolkit and a fetch Gateway. |
| `@sublime-ui/library` | A tokens-first design system: themeable, cross-platform components (~21, including `AppBar`, `GlassAppBar`). |
| `@sublime-ui/ui` | Navigation ("storybooks") plus layout primitives (`Screen`, `Stack`, `Row`, `Spacer`). |
| `@sublime-ui/desktop` | An Electron shell and a typed native bridge for calling Node/OS code from your app. |
| `@sublime-ui/devkit` | The `sublime` CLI: generators, builds, and packaging. |

## Creating and structuring a project

:::note
A one-command project scaffolder is the intended starting point and is on the
way. Until it lands, you set up the workspace and config below, then drive
everything with the real `sublime` commands — `theme:init`, `make:model`,
`make:component`, `build:nav`, and the platform builds.
:::

Every Sublime project is described by a `sublime.config.json` at its root. It
tells the CLI where your code lives:

```json
{
  "modelsDir": "src/models",
  "componentsDir": "src/components",
  "themeDir": "src/theme",
  "navigationDir": "src/navigation",
  "desktop": {}
}
```

Confirm the CLI sees your project:

```bash
npx @sublime-ui/devkit setup
```

`sublime setup` prepares the project (installing the package set and wiring the
config), and `sublime doctor` re-runs the environment checks at any time.

## A tour of the workspace

Sublime's layout separates what is **shared** from what is **platform-specific**.
Models, components, design tokens, and native service contracts are written once.
Screens and each platform's navigation are authored per platform — and desktop
simply reuses the web UI.

```
src/
  components/   # SHARED component quartets (Card, Button…)
  models/       # SHARED models
  theme/        # SHARED design tokens (tokens.json + tokens.ts)
  native/       # SHARED native service contracts (main-process impl)
  screens/
    web/        # web screens
    mobile/     # mobile screens
  navigation/   # storybook.web.ts / storybook.native.ts (+ generated)
web/            # web entry
mobile/         # React Native entry
desktop/        # Electron Forge shell (renderer mounts the web UI)
sublime.config.json
```

A few things worth internalizing early:

- **Shared:** `components/`, `models/`, `theme/`, and `native/` contracts. Write
  them once, use them everywhere.
- **Platform-specific:** every screen lives under `screens/web/` or
  `screens/mobile/`, and each platform gets its own storybook
  (`storybook.web.ts`, `storybook.native.ts`).
- **Component resolution by filename.** A component is a small quartet: `X.tsx`
  (web/MUI), `X.native.tsx` (mobile/Paper), and shared `X.types.ts`. The bundler
  picks the right file per platform — your imports never change.
- **Desktop = web UI.** The `desktop/` Electron Forge shell renders your web
  screens; there are no separate desktop screens.

With Node and the CLI in place and the workspace laid out, you're ready to build
your first app.
