---
sidebar_position: 2
title: Project Structure
---

# Project Structure

A Sublime UI app keeps a **shared core** and **platform-specific UI**. You write
screens per platform; you share everything underneath them.

```
my-app/
  src/
    components/   # SHARED — design-system quartets (Card, Button, …)
    models/       # SHARED — your data models
    theme/        # SHARED — design tokens
    native/       # SHARED contracts — native services (main-only impl)
    screens/
      web/        # web screens
      mobile/     # mobile screens
    navigation/
      storybook.web.ts      # imports ../screens/web
      storybook.native.ts   # imports ../screens/mobile
      navigation.tsx         # generated
      navigation.native.tsx  # generated
  web/            # web entry — mounts the web app
  mobile/         # React Native entry
  desktop/        # Electron Forge shell — renderer mounts the WEB ui
    forge.config.ts, webpack.*.config.ts
    src/main, src/renderer
  sublime.config.json
```

## What is shared vs platform-specific

- **Shared:** components, models, theme, and native service *contracts* — the logic
  and the design system.
- **Platform-specific:** every screen, and each platform's storybook/navigation. A
  mobile screen and a web screen are different files with different layouts; they
  both reach for the same shared `<Card>` / `<Button>` and the same models.
- **Desktop = web UI:** the Forge renderer mounts the web screens and web
  navigation, adding only the native bridge. Mobile and web are the two UI
  families; desktop packages the web one.

## Native services stay clean

`src/native/printer.service.ts` lives in the shared tree but is a main-process
module. The renderer only does `import type` from it, which is erased at build —
so its Node dependencies are bundled by the **main** Webpack build, never the
renderer. `desktop/src/main/main.ts` imports the real implementation and calls
`registerNative([...])`.
