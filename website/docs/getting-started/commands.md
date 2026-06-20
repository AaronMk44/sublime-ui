---
sidebar_position: 5
title: Commands Cheatsheet
---

# Commands Cheatsheet

Every command you'll use building a Sublime app — the ones you run every day up
top, then the full catalog.

## A day in the life

The handful of commands a Sublime UI developer actually runs day to day:

```bash
# ── Start a session ──────────────────────────────────────────────
npm run dev:web            # web app with hot reload (Vite)

# ── After editing navigation (storybook.*.ts) ────────────────────
npm run build:nav          # recompile typed navigation
# …or leave it running:
npx sublime build:nav --watch

# ── Add code ─────────────────────────────────────────────────────
npx sublime make:model Post --fields "title:string, body:string"
npx sublime make:component Card

# ── Check the other targets ──────────────────────────────────────
npm run dev:desktop        # Electron shell (renders the web UI)
npm run dev:mobile         # Android debug build (run `sublime doctor` first)

# ── Before committing ────────────────────────────────────────────
npm run typecheck          # if your app defines it; or: npx tsc --noEmit
```

> **Rule of thumb:** any time you change a `storybook.web.ts` /
> `storybook.native.ts`, re-run `build:nav` (or keep `--watch` running) so the
> generated routes and types stay in sync.

## Copy-paste commands

Each command in its own block — use the copy icon to grab just that one.

### Create a project

```bash
npm create @sublime-ui/app@latest my-app
```

_Scaffold a new app (prompts for name + targets), then installs everything._

### Develop (hot reload)

```bash
npm run dev:web
```

_Web app with hot reload (Vite)._

```bash
npm run dev:desktop
```

_Electron shell with HMR — renders the same web UI._

```bash
npm run dev:mobile
```

_Android debug build (run `sublime doctor` first)._

### Build for release

```bash
npm run build:web
```

_Production web bundle → `dist/web/`._

```bash
npm run build:desktop
```

_Desktop installers → `dist/desktop/`._

```bash
npm run build:mobile
```

_Standalone offline Android APK → `dist/mobile/`._

```bash
npm run build:nav
```

_Compile the storybooks into typed navigation._

### Generate code

```bash
npx sublime make:model Post --fields "title:string, body:string"
```

_Generate a `Model` (+ `registerModel`) and update the models barrel._

```bash
npx sublime make:component Card
```

_Generate a cross-platform component (types + web + native + index)._

```bash
npx sublime theme:init
```

_Scaffold design tokens (`tokens.json` + a typed `tokens.ts`)._

### Navigation

```bash
npx sublime build:nav --watch
```

_Recompile typed navigation on every storybook change._

### Mobile toolchain

```bash
npx sublime doctor
```

_Check the Android toolchain (Node, JDK 17, SDK, NDK, CMake)._

```bash
npx sublime setup
```

_Install the missing toolchain pieces._

```bash
npx sublime run
```

_Install + launch the built APK on a device or emulator._

## Create a project

| Command | What it does |
| --- | --- |
| `npm create @sublime-ui/app@latest my-app` | Scaffold a new app — prompts for name + targets (web / mobile / desktop), then installs everything. |
| `npx @sublime-ui/devkit init my-app` | Same scaffolder, if you already have the CLI. |

Useful flags: `--targets web,desktop` · `--name my-app` · `--no-install` ·
`--no-git` · `--force` (write into a non-empty dir) · `-y` / `--yes` (accept
defaults, no prompts).

## Project scripts

These live in a scaffolded app's `package.json` — run them with `npm run <name>`.
Only the scripts for the targets you selected are present.

| Script | Runs | Target |
| --- | --- | --- |
| `npm run dev:web` | `vite` | Web dev server (hot reload) |
| `npm run build:web` | `vite build` | Web production bundle |
| `npm run dev:mobile` | `sublime build --debug` | Android debug build (needs Metro) |
| `npm run build:mobile` | `sublime build` | Standalone Android APK (offline) |
| `npm run dev:desktop` | `sublime desktop:dev` | Electron shell with HMR |
| `npm run build:desktop` | `sublime desktop:build` | Desktop installers (Win/macOS/Linux) |
| `npm run build:nav` | `sublime build:nav` | Compile storybooks → typed navigation |

All three targets follow the same shape: **`dev:<target>`** to run,
**`build:<target>`** to package.

### Where your builds go

Every `build:*` command writes its final artifact into a single **`dist/`** folder
at the project root — one subfolder per platform, so all your release outputs live
in one place:

| Command | Destination | Contents |
| --- | --- | --- |
| `npm run build:web` | **`dist/web/`** | Static site — `index.html` + hashed `assets/` |
| `npm run build:desktop` | **`dist/desktop/`** | Installers — Squirrel `.exe`, `.zip`, `.deb`, `.rpm` |
| `npm run build:mobile` | **`dist/mobile/`** | The signed `.apk` (or `.aab` when you pass `--aab`) |

`dist/` is git-ignored. Desktop and mobile produce intermediate native build trees
along the way (`desktop/out`, `desktop/.webpack`, `android/`) — those stay in place,
but the finished artifacts are copied into `dist/` for you, so you only ever need to
look in one folder.

## The `sublime` CLI

Installed by `@sublime-ui/devkit` (bin `sublime`, alias `sui`). Run any command
with `npx sublime <command>` or `npx @sublime-ui/devkit <command>`.

### Scaffolding & code generation

| Command | What it does |
| --- | --- |
| `sublime init [dir]` | Scaffold a new app (same as `npm create @sublime-ui/app`). |
| `sublime make:model <Name> [--fields "a:string,b:number"] [--resource /path] [--force]` | Generate a `Model` (+ `registerModel`) and update the models barrel. |
| `sublime make:component <Name> [--mobile-only] [--force]` | Generate a cross-platform component (types + web + native + index). |
| `sublime theme:init [--force]` | Scaffold design tokens (`tokens.json` + a typed `tokens.ts`). |

### Navigation

| Command | What it does |
| --- | --- |
| `sublime build:nav [--watch] [--force] [--project <path>]` | Compile `storybook.web.ts` / `storybook.native.ts` into `navigation.tsx`, `navigation.native.tsx`, a typed route map (`routes.d.ts`), and an index barrel. `--watch` rebuilds on change. |

### Desktop (Electron Forge)

| Command | What it does |
| --- | --- |
| `sublime desktop:dev [--project <path>]` | Run the Electron shell in development (Forge start + HMR). |
| `sublime desktop:build [--project <path>]` | Build desktop installers (Forge make). |

### Mobile (offline Android)

| Command | What it does |
| --- | --- |
| `sublime doctor` | Check the Android toolchain (Node, JDK 17, SDK, NDK, CMake) — a ✓/✗ table. |
| `sublime setup` | Install missing pieces (Windows: a portable JDK 17; macOS/Linux: guided steps). |
| `sublime build [--release\|--debug] [--aab] [--project <path>]` | Build a standalone Android APK fully offline. `--release` (default) embeds the JS bundle; `--debug` needs Metro; `--aab` makes a Play Store bundle. |
| `sublime run [--device <id>] [--project <path>]` | Install and launch the built APK on a device/emulator. |

## See also

- [Scaffold a New App](./scaffold-a-new-app) — the full first-app walkthrough.
- [Running your app](./running) — per-platform run details.
- [Devkit reference](../devkit/overview) — the CLI in depth.
- [Common Errors & Fixes](../troubleshooting) — when a command misbehaves.
