# Mobile nav: shipped AppBar as the default header

**Date:** 2026-06-21
**Status:** Approved
**Scope:** `@sublime-ui/ui`, `@sublime-ui/devkit` (mobile nav generator), demo `sandbox/todo`, website docs.

## Problem

Generated mobile navigation (`navigation.native.tsx`, via `sublime build:nav`) uses
React Navigation's **default native-stack header**. The framework ships an `AppBar`
component (`@sublime-ui/library`, web + native variants) that is never wired into the
generated navigation. Users want the shipped `AppBar` to be the default header on
mobile, with no back arrow on root screens, and the ability to configure or override it.

A snippet was proposed using `cardStyleInterpolator` / `CardStyleInterpolators` from
`@react-navigation/stack`. The framework uses `@react-navigation/native-stack`
exclusively (peer of `ui`, emitted by the generator, installed by the scaffolder).
`@react-navigation/stack` is **not** a dependency and will **not** be introduced.
Native-stack provides the native iOS slide + swipe-back by default; custom transitions
use `animation` / `gestureEnabled`, not `cardStyleInterpolator`.

## Goals

1. Generated mobile nav shows the Sublime `AppBar` instead of the RN default header — by
   default, on **all** formats (`stack`, `bottomNav`, `drawer`).
2. **No back arrow on root screens** (and on tab/drawer top-level screens).
3. Developer-configurable (`title`) and overridable (`header: false` → render your own).
4. Apply these rules **in the generator** so every generated app gets them, not just the demo.

## Non-goals (deliberate follow-ups)

- First-class custom header **component** via the DSL (`header: MyBar`). For now the
  override is `header: false` + render your own bar in-screen. Requires more analyzer
  work (capturing + importing a component identifier); deferred.
- Drawer hamburger/menu button in the AppBar (AppBar has no menu slot today). Drawer
  screens get the AppBar with title only.
- Web header chrome. This change is mobile-only (web nav uses react-router + a `titles`
  map + layout stubs, unchanged).

## Design

### 1. `NavHeader` (native) — new runtime component in `@sublime-ui/ui`

`ui/src/navigation/NavHeader.native.tsx` adapts React Navigation header props to the
shipped `AppBar`:

- `title` = `options.title ?? route.name`
- back arrow only when a back target exists: `const back = 'back' in props ? props.back : undefined` →
  root / tab / drawer top-level screens get **no** back arrow automatically
- `onBack` → `navigation.goBack()`

Accepts the union of `NativeStackHeaderProps | BottomTabHeaderProps | DrawerHeaderProps`
(common subset: `options.title`, `route.name`, `navigation`; `back` only on native-stack).

Exported from `ui/src/navigation/index.ts`. `ui` gains `@sublime-ui/library` as a **peer
dependency** (verified: `library` does not import `ui`, so no cycle). Native-only; no web
variant is generated for headers in this change.

### 2. Generator default (`devkit/src/lib/navigation/render-native.ts`)

Every navigator emits a navigator-level header:

```tsx
import { NavHeader } from '@sublime-ui/ui/navigation';
// ...
<Stack.Navigator screenOptions={{ header: (props) => <NavHeader {...props} /> }}>
  <Stack.Screen name="todos" component={withNav(TodoList)} options={{ title: 'Todos' }} />
</Stack.Navigator>
```

`animation` / `gestureEnabled` stay at native-stack defaults (no `cardStyleInterpolator`).

### 3. Config / override via the page DSL

`PageOptions` (`ui/src/navigation/types.ts`) and the analyzer model gain:

- `header?: boolean` — `false` ⇒ emit `headerShown: false` for that screen (override path:
  render your own bar in-screen). Omitted ⇒ default Sublime AppBar.
- Book-level `header: false` sets the default for all its pages; per-page wins.
- `title` continues to set the AppBar title.

`analyze-storybook.ts` reads the `header` boolean prop (mirrors `initial`); `model.ts`
`PageOptions` mirrors the type.

### 4. Correctness fixes folded in (required — regeneration clobbers the demo's hand-patches)

- **NavBridge placement bug:** the generator currently wraps `<RootNavigator/>` in a
  container-level `<NavBridge>` that calls `useNativeNav()` → `useRoute()` **outside** any
  screen → "Couldn't find a route object". Replace with a per-screen `withNav(Component)`
  HOC that provides `<NavProvider>` inside each leaf page. (This is the patch the demo
  applied by hand.) Only leaf `page` components are wrapped; nested book navigators are not.
- **Nested-navigator double header:** a book mounted inside another navigator emits
  `headerShown: false` on its host screen, so only the inner navigator's AppBar shows.

### 5. Tests + rollout

- Unit-test `NavHeader` in `ui` (back hidden when no `back`; title falls back to route name).
- Update `devkit` `render-native` string/snapshot tests + `test/fixtures/nav-app` expected
  output for the new `screenOptions` header, `withNav` wrapping, and `headerShown` rules.
- Build `ui` + `devkit`; run full suites green.
- Regenerate the demo nav (`sublime build:nav`); rebuild release APK (JDK 17); verify on the
  phone: Sublime AppBar shows, no RN default header, no back arrow on the root screen.
- Add user-facing Docusaurus docs (`website/`): default mobile AppBar header, no-back-on-root,
  and header config (`title`, `header: false`).

## Files touched

- `ui/src/navigation/NavHeader.native.tsx` (new), `ui/src/navigation/index.ts`,
  `ui/src/navigation/types.ts`, `ui/package.json` (peer dep), `ui/test/NavHeader.*.test.tsx` (new)
- `devkit/src/lib/navigation/render-native.ts`, `devkit/src/lib/navigation/model.ts`,
  `devkit/src/lib/navigation/analyze-storybook.ts`, `devkit/test/...`, `devkit/test/fixtures/nav-app/...`
- `sandbox/todo/src/navigation/*` (regenerated), demo APK
- `website/` docs page(s)
