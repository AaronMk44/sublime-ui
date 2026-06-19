# Sublime UI — Cross-Platform Navigation ("Storybook") (#5a) — Design

Date: 2026-06-19
Status: Draft (pending written-spec review)

## 1. Program context

**Sublime UI** is a TypeScript-only, cross-platform app framework — write the
non-UI parts once, run on mobile / web / desktop. This is sub-project **#5a:
cross-platform navigation**, the routing layer that sits on top of the library
(#4) screens and feeds the desktop packaging (#5b) and starter template (#6).

Depends on #0 (monorepo), #2 (framework), #4 (library — platform `.native`/web
file resolution, `SublimeProvider`), all merged/locked. It introduces a new
runtime package **`@sublime-ui/ui`** plus a new devkit compile command.

### The idea

App developers describe navigation with a novel **"storybook"** abstraction
instead of writing React Navigation (mobile) and react-router (web) by hand:

- A **Book** is a navigator. It has a **print format** that decides how its pages
  are presented (drawer, stack, bottom-nav on mobile; sidebar, stack, tabs on web).
- A **Page** is a screen — one page follows another.
- A Book can **link to another Book** (nested navigator), and that book has its
  own pages and its own print format.

Crucially, books are **authored separately per platform** — the mobile storybook
references mobile screens and mobile print formats; the web storybook references
web screens and web print formats. A **devkit compile step** then converts each
platform's storybook into the idiomatic native artifact: `navigation.native.tsx`
(React Navigation) and `navigation.web.tsx` (react-router). App code navigates
through one typed API: `nav.turnTo(name, params)`.

The payoff: navigation reads like describing a book, every route name + its params
are statically typed, and each platform still gets hand-quality idiomatic output
with platform libraries imported **only** in their own platform file.

## 2. Core concepts

| Concept | Authoring | Compiles to (native) | Compiles to (web) |
|---|---|---|---|
| **Book** (navigator + print format) | `book({ format, pages })` | a React Navigation navigator | a react-router route subtree + layout |
| **Page** (a screen) | `page(Screen, opts)` | a `Screen` in the navigator | a `<Route>` |
| **Link** (book → book) | `link(otherBook, opts)` | a nested navigator | a nested route subtree |
| **Print format** | validated string union | navigator kind | layout kind |

### Print formats (validated)

Formats are a **string union per platform**, so an invalid value is a *type
error*, and a compile-step check enforces the value-level constraints:

- **Mobile:** `'drawer' | 'stack' | 'bottomNav'`
  - `bottomNav` is capped at **≤ 5 pages** (Material guidance). Enforced by the
    compile step with a clear error naming the offending book + page count. Books
    with more tabs must use `drawer`, or split overflow into a linked stack book.
- **Web:** `'sidebar' | 'stack' | 'tabs'`

A book's format only accepts its own platform's union, so a mobile book can never
be given `'sidebar'` and a web book can never be given `'bottomNav'`.

### Why books are separated per platform

Mobile and web navigation are genuinely different shapes — a phone's 5-tab
bottom-nav is an 8-link sidebar on the web; a mobile flow that pushes a stack is a
set of nested routes on the web. Forcing one tree to serve both leaks compromises
into both. Separate books let each platform have its **own structure, its own
print formats, and even its own set of pages**, while the *screens themselves*
remain shared where it makes sense (a `ProductDetail` screen can still be a single
platform-resolved component used by both books).

## 3. Authoring API

Two entry files, one per platform, by convention under `src/navigation/`:

- `storybook.native.ts` — the mobile book tree (mobile screens + mobile formats)
- `storybook.web.ts` — the web book tree (web screens + web formats)

Each default-exports a **root book**. Helpers come from `@sublime-ui/ui/navigation`.

### 3.1 Mobile storybook

```ts
// src/navigation/storybook.native.ts
import { book, page, link } from '@sublime-ui/ui/navigation';
import { Home } from '../screens/Home';
import { ProductDetail } from '../screens/ProductDetail';
import { settingsBook } from './settings.native';

export default book({
  format: 'bottomNav',                 // 'drawer' | 'stack' | 'bottomNav'
  pages: {
    home:    page(Home,          { title: 'Home',    icon: 'home' }),
    product: page<{ id: number }>(ProductDetail, { title: 'Product' }),
    settings: link(settingsBook, { title: 'Settings', icon: 'cog' }),
  },
});
```

### 3.2 A linked sub-book

```ts
// src/navigation/settings.native.ts
import { book, page } from '@sublime-ui/ui/navigation';
import { SettingsHome } from '../screens/SettingsHome';
import { Profile } from '../screens/Profile';

export const settingsBook = book({
  format: 'stack',
  pages: {
    settingsHome: page(SettingsHome, { title: 'Settings' }),
    profile:      page(Profile,      { title: 'Profile' }),
  },
});
```

### 3.3 Web storybook (same screens or web-specific ones)

```ts
// src/navigation/storybook.web.ts
import { book, page, link } from '@sublime-ui/ui/navigation';
import { Home } from '../screens/Home';
import { ProductDetail } from '../screens/ProductDetail';
import { settingsBook } from './settings.web';

export default book({
  format: 'sidebar',                   // 'sidebar' | 'stack' | 'tabs'
  pages: {
    home:    page(Home,          { title: 'Home',    icon: 'home' }),
    product: page<{ id: number }>(ProductDetail, { title: 'Product' }),
    settings: link(settingsBook, { title: 'Settings', icon: 'cog' }),
  },
});
```

### 3.4 Page / link options

```ts
interface PageOptions {
  title?: string;       // header / tab / drawer label
  icon?: string;        // icon name for tab/drawer/sidebar entries (ignored by 'stack')
  path?: string;        // web: explicit URL segment; defaults to the page key (kebab-cased)
  initial?: boolean;    // mark the starting page of its book (defaults to first key)
}
```

`page<Params>(Screen, opts?)` — `Params` (defaults to `void`/no-params) is what
makes `turnTo('product', { id })` typed. `link(book, opts?)` nests a book; its
`opts` describe how the *entry point* appears in the parent (label/icon).

### 3.5 Type derivation — the route map

`book(...)` returns a phantom-typed value carrying a **`RouteMap`** — a mapping of
every reachable page key (flattened across linked books) to its `Params`. The
compile step also emits this map as a generated `routes.d.ts`, so `turnTo` is typed
from a single source of truth. Duplicate page keys across linked books are a
compile-step error (keys are the global navigation namespace).

## 4. Navigation runtime API

App code never imports React Navigation or react-router directly — it uses `useNav`:

```ts
import { useNav } from '@sublime-ui/ui/navigation';

function ProductCard({ id }: { id: number }) {
  const nav = useNav();
  return <Button onPress={() => nav.turnTo('product', { id })}>Open</Button>;
}
```

The `nav` object (the "reader"):

| Method | Meaning | Native maps to | Web maps to |
|---|---|---|---|
| `turnTo(name, params?)` | go to a page (params required iff the page declares them) | `navigation.navigate(name, params)` | `navigate(pathFor(name, params))` |
| `turnBack()` | go back one page | `navigation.goBack()` | `navigate(-1)` |
| `current()` | the active page key | route name | matched route key |
| `params<T>()` | typed params of the current page | route params | parsed path/query params |

`turnTo` is **type-safe against the generated `RouteMap`**: an unknown name is a
type error, and params are required exactly when the target page declared them
(`turnTo('home')` with no params; `turnTo('product', { id: 1 })` requires the id).

## 5. Layout primitives

Screens compose from a tiny shared, platform-resolved primitive set (in
`@sublime-ui/ui`, same `.native`/web file-resolution as #4):

- **`<Screen>`** — a safe-area-aware page root (padding, scroll option, background
  from tokens). Native = `SafeAreaView`/`ScrollView`; web = a `<main>` wrapper.
- **`<Stack>`** — vertical flex container (`gap`, `align`, `justify`).
- **`<Row>`** — horizontal flex container (`gap`, `align`, `justify`, `wrap`).
- **`<Spacer>`** — flexible/fixed gap.

These are intentionally minimal — they cover the "arrange a screen" 80% case and
keep screen code identical across platforms. They are independent of the storybook
(usable anywhere), but ship in the same package because screens use both.

## 6. The compile step (devkit)

A new devkit command converts storybooks into navigation artifacts:

```
sublime build:nav [--watch] [--out src/navigation]
```

It reads `sublime.config.json` for the navigation dir (new optional
`navigationDir`, default `src/navigation`), loads both `storybook.native.ts` and
`storybook.web.ts`, validates them, and emits:

- `src/navigation/navigation.native.tsx` — a `<Navigation>` root that builds the
  React Navigation tree from the mobile book (bottomNav → `createBottomTabNavigator`,
  drawer → `createDrawerNavigator`, stack → `createNativeStackNavigator`; linked
  books → nested navigators).
- `src/navigation/navigation.web.tsx` — a `<Navigation>` root that builds the
  react-router tree from the web book (sidebar/tabs → a layout component with a
  persistent chrome + `<Outlet/>`; stack/linked books → nested `<Route>`s).
- `src/navigation/routes.d.ts` — the generated `RouteMap` (name → params) backing
  `turnTo`.
- `src/navigation/index.ts` — re-exports the platform-resolved `<Navigation>` and
  the typed nav so the app imports from one place.

The two `.tsx` files are platform-resolved by the bundler (#4's mechanism), so
React Navigation is imported **only** in `.native.tsx` and react-router **only** in
the web file — neither leaks into the other platform's bundle.

### Validation performed at compile time

- Print-format value is in the platform's union (also a type error at authoring).
- `bottomNav` book has **≤ 5** direct pages.
- No duplicate page keys across the whole reachable tree.
- Every `page()` references a component; every `link()` references a `book()`.
- Exactly one initial page per book (defaults to the first key; `>1` explicit
  `initial: true` is an error).

Failures print a clear message (book name, the rule, the fix) and exit non-zero.

### Why compile-time, not a runtime interpreter

- **Idiomatic output** — generated code is what an expert would hand-write, so it
  plays well with the platform ecosystems (deep links, gestures, the browser URL
  bar) instead of fighting a generic runtime.
- **Tree-shakeable + typed** — only the used navigators ship; `routes.d.ts` gives
  editor autocomplete on every route name and its params.
- **Clean platform split** — heavy platform libs never cross into the other bundle.

### App wiring (generated `<Navigation>` consumed once)

```tsx
// App.tsx
import { SublimeProvider } from '@sublime-ui/ui';
import { Navigation } from './navigation';   // platform-resolved

export default function App() {
  return (
    <SublimeProvider tokens={tokens}>
      <Navigation />
    </SublimeProvider>
  );
}
```

`<Navigation>` provides the nav context that `useNav` reads, bridging to React
Navigation's `useNavigation` (native) or react-router's `useNavigate`/`useParams`
(web) underneath.

## 7. Internal structure

```
ui/                                  # @sublime-ui/ui  (new package)
  src/
    navigation/
      book.ts            # book()/page()/link() authoring helpers + phantom RouteMap types (pure)
      types.ts           # PrintFormat unions, PageOptions, BookDef, RouteMap helpers
      use-nav.ts         # useNav() facade + NavContext
      use-nav.native.ts  # bridges to @react-navigation/native
      use-nav.web.ts     # bridges to react-router
    layout/
      Screen.tsx / Screen.native.tsx / Screen.types.ts
      Stack.tsx  / Stack.native.tsx
      Row.tsx    / Row.native.tsx
      Spacer.tsx / Spacer.native.tsx
    index.ts             # re-exports layout + SublimeProvider passthrough
    navigation/index.ts  # re-exports navigation public API

devkit/src/
  commands/build-nav.ts          # command glue: load storybooks, validate, write
  lib/navigation/
    load-storybook.ts            # import + read a platform book tree (impure: dynamic import)
    validate.ts                  # pure: format/count/dup-key/initial checks -> diagnostics[]
    flatten.ts                   # pure: book tree -> flat route list + RouteMap
    render-native.ts             # pure: route tree -> navigation.native.tsx string
    render-web.ts                # pure: route tree -> navigation.web.tsx string
    render-routes-dts.ts         # pure: RouteMap -> routes.d.ts string
```

### Pure logic isolated for TDD

`validate`, `flatten`, and all `render*` functions are deterministic — unit-tested
by asserting diagnostics and exact generated strings. The thin command glue
(dynamic import of the user's storybook + fs writes) is exercised by a temp-dir
smoke test over a fixture app.

## 8. Dependencies

- `@sublime-ui/ui` peer-deps (all optional, platform-gated like #4):
  `@react-navigation/native` + the native-stack/bottom-tabs/drawer navigators +
  `react-native-screens`/`safe-area-context` (mobile); `react-router-dom` (web);
  `react` (both). Reuses #4's `react-native` field → `src` and tsup `bundle:false`
  split so `.native`/web files resolve correctly.
- Devkit reuses its existing `commander`, `picocolors`, `util/log`, the #3
  `loadConfig`, safe `write.ts`, and idempotent `barrel.ts`.

## 9. Testing

- **TDD (vitest)** on the pure units: `validate` (each rule: bad format, 6-page
  bottomNav, duplicate keys, double-initial), `flatten` (nested linked books →
  correct flat map + RouteMap), `render-native`/`render-web`/`render-routes-dts`
  (exact generated strings for each print format incl. a nested book).
- **Type tests** (`tsd` or `vitest` + `expectTypeError`): `turnTo` rejects unknown
  names, requires params when declared, forbids params when not; wrong-platform
  format is a type error.
- **Smoke test:** run `build:nav` over a fixture app with both storybooks; assert
  the four files are written and that the generated `.native.tsx` + `.web.tsx`
  `tsc --noEmit` against the real platform peers.
- Monorepo typecheck/lint/test/build green.

## 10. Scope & future (YAGNI)

**In #5a v1:** the storybook authoring API (`book`/`page`/`link`); mobile + web
print-format unions with `bottomNav ≤ 5`; the `build:nav` compile step emitting
`navigation.native.tsx` + `navigation.web.tsx` + `routes.d.ts`; the typed `useNav`
(`turnTo`/`turnBack`/`current`/`params`); the `Screen`/`Stack`/`Row`/`Spacer`
layout primitives; full TDD on the pure generators.

**Out of scope (future):**
- **Deep linking / URL config** beyond the default page-key path mapping
  (custom URL schemes, native deep-link config, path params in the URL beyond
  `:id`-style) — a `build:nav` enhancement.
- **Per-page guards / redirects** (auth gating) and transition/animation config.
- **`make:screen` / `make:book` generators** — devkit #3-style scaffolding for a
  screen + its storybook entry. Natural follow-up once the runtime is locked.
- **Desktop (#5b)** window/menu chrome and web↔desktop state sync — its own
  sub-project; #5a's web book is the substrate the desktop shell renders.

## 11. Acceptance criteria

- An app author writes `storybook.native.ts` and `storybook.web.ts` using
  `book/page/link`; a mobile `book({ format: 'sidebar' })` or a web
  `book({ format: 'bottomNav' })` is a **type error**.
- `sublime build:nav` validates both books and emits `navigation.native.tsx`,
  `navigation.web.tsx`, `routes.d.ts`, and `navigation/index.ts`; a 6-page
  `bottomNav` book, a duplicate page key, or a dangling `link` fails with a clear
  message + non-zero exit.
- In a screen, `const nav = useNav(); nav.turnTo('product', { id: 1 })` type-checks;
  `nav.turnTo('product')` (missing params) and `nav.turnTo('nope')` (unknown name)
  are type errors.
- The generated `<Navigation>` renders the correct navigator per platform
  (bottomNav/drawer/stack on native; sidebar/tabs/stack on web), with React
  Navigation imported only in the native file and react-router only in the web file.
- `Screen`/`Stack`/`Row`/`Spacer` render on both platforms from one screen source.
- Pure generators/validators are unit-tested; type tests pass; a temp-dir smoke
  test compiles the generated artifacts; monorepo typecheck/lint/test/build green.
```
