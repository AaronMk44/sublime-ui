# @sublime-ui/devkit

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

### Patch Changes

- Harmonize the generated app's desktop scripts to match the web/mobile naming:
  `desktop:dev` → `dev:desktop` and `desktop:build` → `build:desktop`. Scaffolded
  apps now have a consistent `dev:<target>` / `build:<target>` script set
  (`dev:web`, `dev:mobile`, `dev:desktop`, …). The `sublime desktop:dev` /
  `desktop:build` CLI commands are unchanged.

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
