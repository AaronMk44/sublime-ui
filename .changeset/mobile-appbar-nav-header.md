---
"@sublime-ui/ui": minor
"@sublime-ui/devkit": minor
"@sublime-ui/library": patch
"@sublime-ui/storage": patch
---

Mobile navigation now renders the shipped AppBar as its default header, plus a SQLite read fix:

- ui: new `NavHeader` (native) adapts React Navigation header props to the shipped `AppBar` (title falls back to the route name; back arrow only when there is a screen to go back to). The page/book DSL gains `header?: boolean`. `@sublime-ui/library` is an optional peer.
- devkit: `build:nav` emits `NavHeader` as every navigator's default header, wraps leaf screens in a per-screen `withNav` HOC (fixes the container-level `useRoute()` "Couldn't find a route object" crash), and sets `headerShown: false` on nested-navigator hosts so headers do not stack. `header: false` (per page or per book) opts out and renders your own bar.
- library: `AppBar.native` tints the OS status bar to match the bar (theme-aware contrast) so the notification area is not a bare white strip.
- storage: `SqliteAdapter` ensures the table exists at the start of every operation, so the first read no longer races `CREATE TABLE` ("no such table") on mobile.
