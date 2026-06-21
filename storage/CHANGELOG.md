# @sublime-ui/storage

## 2.0.0

### Patch Changes

- a17ff80: Mobile navigation now renders the shipped AppBar as its default header, plus a SQLite read fix:

  - ui: new `NavHeader` (native) adapts React Navigation header props to the shipped `AppBar` (title falls back to the route name; back arrow only when there is a screen to go back to). The page/book DSL gains `header?: boolean`. `@sublime-ui/library` is an optional peer.
  - devkit: `build:nav` emits `NavHeader` as every navigator's default header, wraps leaf screens in a per-screen `withNav` HOC (fixes the container-level `useRoute()` "Couldn't find a route object" crash), and sets `headerShown: false` on nested-navigator hosts so headers do not stack. `header: false` (per page or per book) opts out and renders your own bar.
  - library: `AppBar.native` tints the OS status bar to match the bar (theme-aware contrast) so the notification area is not a bare white strip.
  - storage: `SqliteAdapter` ensures the table exists at the start of every operation, so the first read no longer races `CREATE TABLE` ("no such table") on mobile.

- 0b9ec46: Fix release bugs found via a cross-platform consumer app:
  - storage: emit dist/sqlite/\* (bundle:false entry gap) so bundlers resolve the package
  - devkit: scaffold pins ^1.0.0 (was ^0.1.0) and adds react-redux
  - devkit: scaffold roots wrap in <Provider store={store}> (required by Model.rxAll)
  - devkit: scaffold wires the mobile entry (package.json main + registerRootComponent) and adds metro.config.cjs (package-exports) so the mobile target runs
  - devkit: doctor detects NDK/CMake by filesystem and the legacy sdkmanager (no more false negatives)
  - @sublime-ui/framework@2.0.0
  - @sublime-ui/desktop@2.0.0

## 1.0.0

### Patch Changes

- Updated dependencies [48fffd0]
- Updated dependencies [74e67f7]
  - @sublime-ui/desktop@1.0.0
  - @sublime-ui/framework@1.0.0
