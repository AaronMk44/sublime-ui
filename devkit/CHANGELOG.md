# @sublime-ui/devkit

## 3.0.0

### Minor Changes

- 7ae163a: `sublime setup` now provisions the complete Android build toolchain (JDK 17 +
  cmdline-tools + licenses + platform-tools + platform + build-tools + NDK +
  CMake) automatically on Windows, macOS, and Ubuntu — no admin, no Homebrew/apt.
  Everything installs under `~/.sublime/` and is auto-detected by `sublime
doctor` and `sublime build` with no environment changes. The CLI now shows a
  download progress bar and numbered phases.

## 2.0.0

### Minor Changes

- a17ff80: Mobile navigation now renders the shipped AppBar as its default header, plus a SQLite read fix:

  - ui: new `NavHeader` (native) adapts React Navigation header props to the shipped `AppBar` (title falls back to the route name; back arrow only when there is a screen to go back to). The page/book DSL gains `header?: boolean`. `@sublime-ui/library` is an optional peer.
  - devkit: `build:nav` emits `NavHeader` as every navigator's default header, wraps leaf screens in a per-screen `withNav` HOC (fixes the container-level `useRoute()` "Couldn't find a route object" crash), and sets `headerShown: false` on nested-navigator hosts so headers do not stack. `header: false` (per page or per book) opts out and renders your own bar.
  - library: `AppBar.native` tints the OS status bar to match the bar (theme-aware contrast) so the notification area is not a bare white strip.
  - storage: `SqliteAdapter` ensures the table exists at the start of every operation, so the first read no longer races `CREATE TABLE` ("no such table") on mobile.

### Patch Changes

- 0b9ec46: Fix release bugs found via a cross-platform consumer app:
  - storage: emit dist/sqlite/\* (bundle:false entry gap) so bundlers resolve the package
  - devkit: scaffold pins ^1.0.0 (was ^0.1.0) and adds react-redux
  - devkit: scaffold roots wrap in <Provider store={store}> (required by Model.rxAll)
  - devkit: scaffold wires the mobile entry (package.json main + registerRootComponent) and adds metro.config.cjs (package-exports) so the mobile target runs
  - devkit: doctor detects NDK/CMake by filesystem and the legacy sdkmanager (no more false negatives)

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
