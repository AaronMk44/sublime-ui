# @sublime-ui/ui

## 3.0.0

### Patch Changes

- @sublime-ui/library@3.0.0

## 2.0.0

### Minor Changes

- a17ff80: Mobile navigation now renders the shipped AppBar as its default header, plus a SQLite read fix:

  - ui: new `NavHeader` (native) adapts React Navigation header props to the shipped `AppBar` (title falls back to the route name; back arrow only when there is a screen to go back to). The page/book DSL gains `header?: boolean`. `@sublime-ui/library` is an optional peer.
  - devkit: `build:nav` emits `NavHeader` as every navigator's default header, wraps leaf screens in a per-screen `withNav` HOC (fixes the container-level `useRoute()` "Couldn't find a route object" crash), and sets `headerShown: false` on nested-navigator hosts so headers do not stack. `header: false` (per page or per book) opts out and renders your own bar.
  - library: `AppBar.native` tints the OS status bar to match the bar (theme-aware contrast) so the notification area is not a bare white strip.
  - storage: `SqliteAdapter` ensures the table exists at the start of every operation, so the first read no longer races `CREATE TABLE` ("no such table") on mobile.

### Patch Changes

- Updated dependencies [a17ff80]
  - @sublime-ui/library@2.0.0

## 1.0.0

## 0.1.3

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
