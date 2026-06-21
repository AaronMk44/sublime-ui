# @sublime-ui/library

## 2.0.0

### Patch Changes

- a17ff80: Mobile navigation now renders the shipped AppBar as its default header, plus a SQLite read fix:

  - ui: new `NavHeader` (native) adapts React Navigation header props to the shipped `AppBar` (title falls back to the route name; back arrow only when there is a screen to go back to). The page/book DSL gains `header?: boolean`. `@sublime-ui/library` is an optional peer.
  - devkit: `build:nav` emits `NavHeader` as every navigator's default header, wraps leaf screens in a per-screen `withNav` HOC (fixes the container-level `useRoute()` "Couldn't find a route object" crash), and sets `headerShown: false` on nested-navigator hosts so headers do not stack. `header: false` (per page or per book) opts out and renders your own bar.
  - library: `AppBar.native` tints the OS status bar to match the bar (theme-aware contrast) so the notification area is not a bare white strip.
  - storage: `SqliteAdapter` ensures the table exists at the start of every operation, so the first read no longer races `CREATE TABLE` ("no such table") on mobile.

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
