# @sublime-ui/library

## 1.0.0

## 0.1.3

### Patch Changes

- b501b3b: Fix scaffolded apps failing to build on all three targets.

  - **library**: split `generateThemes` into a web build (MUI only) and a `.native`
    build (React Native Paper) so the web bundle no longer pulls in `react-native`
    (which broke Vite/webpack on RN's Flow syntax).
  - **devkit (web)**: emit `index.html` at the project root so Vite resolves the
    entry; `build:nav` now only analyzes the storybooks that exist (a web-only app no
    longer errors on a missing `storybook.native.ts`).
  - **devkit (desktop)**: install the nested `desktop/` Electron Forge dependencies
    during `init`, and run Forge via `npm start` / `npm run make` (local `.bin`)
    instead of a bare `electron-forge`; add `resolve.extensionAlias` to the webpack
    configs so `.js` specifiers resolve to `.ts`/`.tsx`.
  - **devkit (mobile)**: add `expo` to the mobile dependencies and emit an
    expo-shaped `app.json` so `expo prebuild` works.
  - **desktop**: add a node-free `@sublime-ui/desktop/preload` export and point the
    scaffolded preload at it, so the preload bundle no longer drags in main-process
    services that import `node:fs/promises`.

## 0.1.2

## 0.1.1
