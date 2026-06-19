---
sidebar_position: 1
title: Scaffold a New App
---

# Scaffold a New App

This is the fastest way to go from nothing to a running, cross-platform Sublime
app. The generator writes a complete project — shared models and theme,
per-platform screens, compiled navigation — and installs everything for you.

## Prerequisites

- **Node.js 18+** and npm.
- For the **mobile** target you'll also need the Android toolchain later
  (`sublime doctor` checks it) — but you can scaffold and run web/desktop without
  it.

## Step 1 — Run the generator

```bash
npm create @sublime-ui/app@latest my-app
```

`npm create @sublime-ui/app` downloads and runs `@sublime-ui/create-app`. The
`my-app` argument is the folder (and default app name) to create.

> Already have the CLI installed? `sublime init my-app` does exactly the same
> thing — both share one engine.

## Step 2 — Answer the prompts

```text
? App name: my-app
? Targets: (space to toggle, enter to accept)
 ◉ web (Vite + MUI)
 ◉ mobile (React Native + Paper)
 ◉ desktop (Electron, wraps web)
```

All three targets are pre-checked — press **Enter** to get the full
write-once-run-everywhere app, or toggle off the ones you don't need. (Desktop
renders the web UI, so it always comes with web.)

## Step 3 — Let it install

The generator writes the files, runs `git init`, then `npm install` and
`sublime build:nav` (which compiles your navigation). When it finishes you'll
see your next steps:

```text
✓ Scaffolded my-app (web, mobile, desktop)
Next:  cd my-app
       npm run dev:web
```

## What just got generated

```text
my-app/
  src/
    models/Task.ts          # a sample model (reactive, cache-first data)
    theme/tokens.ts         # design tokens shared across platforms
    screens/web/            # web screens (TaskList → TaskDetail)
    screens/mobile/         # mobile screens (.native.tsx)
    navigation/             # storybook.web.ts + storybook.native.ts (+ generated)
    native/greeter.service.ts   # a sample desktop native service
  web/                      # web entry (Vite)
  mobile/                   # React Native entry
  desktop/                  # Electron Forge shell
  sublime.config.json
```

Every piece is a **working example of one subsystem** — a model, a theme, a
screen per platform, typed navigation, and (on desktop) a native bridge call.
Read them, then replace them with your own.

> **About the `navigation/` directory.** You author `storybook.web.ts` and
> `storybook.native.ts`; `build:nav` compiles them into the typed
> `navigation.tsx` (web) and `navigation.native.tsx` (mobile) plus an `index.ts`
> barrel. The compiled files are generated — edit the storybooks, not them.

## Step 4 — Run the web app

```bash
cd my-app
npm run dev:web
```

Open the printed URL. You'll see the **Tasks** screen (from
`src/screens/web/TaskList.tsx`); clicking a task navigates to the typed
**Task** detail screen via `nav.turnTo('task', { id })`.

## Step 5 — Run the desktop app

```bash
npm run desktop:dev
```

This launches the Electron shell, which renders the **same web UI** and adds the
native bridge. The sample `greeter` service runs in the main process and is
called from the renderer with `useNative('greeter')`.

## Step 6 — Run the mobile app

```bash
sublime doctor        # check the Android toolchain (one-time)
npm run dev:mobile    # build + run on a device/emulator
```

Mobile uses your `src/screens/mobile/*.native.tsx` screens and
`storybook.native.ts` (a `bottomNav` layout). See
[Running your app](./running) for device setup.

## Step 7 — Make it yours

- **Add a model:** `sublime make:model Post --fields "title:string"`
- **Add a component:** `sublime make:component Card`
- **Edit navigation:** change `src/navigation/storybook.web.ts` /
  `storybook.native.ts`, then re-run `npm run build:nav`.

When you change navigation, always re-run `build:nav` to regenerate the typed
routes.

## Next steps

- [Your First App](./your-first-app) — build the same app by hand to understand
  each layer.
- [The Learning Path](../learning-path) — basics to advanced.
