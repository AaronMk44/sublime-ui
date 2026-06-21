# @sublime-ui/desktop

## 2.0.0

## 1.0.0

### Patch Changes

- 48fffd0: Fix desktop runtime crashes, polish the scaffold, and consolidate build output.

  - **desktop**: add a node-free `@sublime-ui/desktop/preload` export and point the
    scaffolded preload at it, so the preload bundle no longer drags main-process
    services (`node:fs`) into the sandboxed renderer.
  - **devkit (desktop webpack)**: the asset-relocator / node-loader now run on the
    **main** build only — running them on the sandboxed renderer/preload injected a
    `__dirname` reference that crashed at runtime. Added `resolve.extensionAlias` so
    `.js` specifiers resolve to `.ts`/`.tsx`.
  - **devkit (tokens)**: the scaffold now emits a **complete, valid `SublimeTokens`**
    `tokens.json` (was a partial shape that crashed `generateThemes` at render), and
    `tokens.ts` uses a checked type instead of `as unknown as` so drift fails `tsc`.
  - **devkit (navigation)**: generated web navigation uses **`HashRouter`**, so routing
    works in the browser, on static hosts (no rewrites), and inside Electron (dev +
    packaged `file://`).
  - **devkit (sample screens)**: the generated web + mobile screens use the design
    system (`Text`/`Card`/`Button`) instead of raw HTML/Paper, so a new app looks
    styled out of the box.
  - **devkit (build output)**: every `build:*` now writes into one `dist/` folder —
    web → `dist/web`, desktop → `dist/desktop` (installers), mobile → `dist/mobile`
    (APK/AAB).

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

### Patch Changes

- c487076: Fix real-app package consumption and add the starter-app generator.

  - **ui, desktop:** emit ESM with explicit `.js` specifiers so the built packages
    resolve under Node's native ESM. (`0.1.0` shipped extensionless relative
    imports that broke any real install with `ERR_MODULE_NOT_FOUND`.)
  - **devkit:** `build:nav` now statically analyzes storybooks via the TypeScript
    compiler API instead of executing them, so it works with storybooks that import
    real `.tsx` screens / `react-native`. The compiled web navigation is emitted as
    `navigation.tsx` (with `navigation.native.tsx` for mobile).
  - **framework:** `registerModel` accepts a `Model` subclass whose `resource` is
    `protected static`.
  - **New:** `npm create @sublime-ui/app` (the `@sublime-ui/create-app` package) and
    `sublime init` scaffold a complete web/mobile/desktop Sublime app from a minimal
    vertical slice, with interactive target selection.
