---
sidebar_position: 11
title: Common Errors
---

# Common Errors & Fixes

A field guide to the errors you're most likely to hit building a Sublime app, and
how to resolve each one.

## Installation

### `npm install` fails with `ERESOLVE` / peer dependency conflict

```text
npm error ERESOLVE could not resolve
npm error While resolving: react-native-screens@…
npm error Could not resolve dependency: peer react-native@">=0.82.0"
```

**Why:** the React Native ecosystem pins peer dependencies strictly, and a few
transitive packages (e.g. `react-native-screens`) demand a newer `react-native`
than your app declares. npm's default resolver treats this as fatal.

**Fix:** install with legacy peer resolution — this is expected for any app with
the mobile target:

```bash
npm install --legacy-peer-deps
```

Apps scaffolded with `npm create @sublime-ui/app` already run install this way.

### Install hangs or fails downloading Electron

**Why:** the `electron` package's postinstall downloads a ~100 MB binary; on a
slow or offline connection it stalls or fails.

**Fix:** skip the binary download when you only need types / aren't running the
desktop app yet:

```bash
ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm install --legacy-peer-deps
```

Run a plain `npm install` later (online) when you actually want to launch the
desktop shell.

### `ERR_MODULE_NOT_FOUND` importing `@sublime-ui/ui` or `@sublime-ui/desktop`

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../dist/navigation/book'
```

**Why:** `@sublime-ui` `0.1.0` shipped ESM with extensionless relative imports,
which Node's native ESM resolver rejects.

**Fix:** upgrade to **`0.1.1` or newer**, which emits correct `.js` specifiers:

```bash
npm install @sublime-ui/ui@latest @sublime-ui/desktop@latest --legacy-peer-deps
```

## Navigation (`build:nav`)

### `Storybook … must default-export a book().`

**Why:** `build:nav` reads each storybook's **default export**. A storybook that
exports its `book(...)` as a named const, or not at all, can't be compiled.

**Fix:** end every `storybook.web.ts` / `storybook.native.ts` with:

```ts
export default book({ /* … */ });
```

### `build:nav failed with N error(s); wrote nothing.`

`build:nav` validates before generating and writes nothing if any rule fails. The
diagnostics name the rule:

| Diagnostic | Meaning | Fix |
| --- | --- | --- |
| `bottomNav-max-5` | A `bottomNav` book has more than 5 pages | Use ≤5 pages, or switch to `drawer`/`stack` |
| `format-platform` | A web format (`sidebar`/`tabs`) used in `storybook.native.ts` (or vice-versa) | Use mobile formats (`drawer`/`stack`/`bottomNav`) on native, web formats on web |
| `duplicate-key` | The same page key appears twice (incl. across nested books) | Make every page key unique |
| `multiple-initial` | More than one page sets `initial: true` in one book | Mark exactly one page `initial` per book |
| `dangling` | A page has no component, or a book has no children | Give the page a component / the book at least one page |
| `bad-link` | `link(x)` where `x` isn't a `book()` | Pass an actual `book(...)` to `link()` |

### My screen/route changes don't show up

**Why:** navigation is **compiled ahead of time** — the running app uses the
generated `navigation.tsx` / `navigation.native.tsx`, not your storybook directly.

**Fix:** re-run the compiler after editing a storybook:

```bash
npm run build:nav        # or: npx @sublime-ui/devkit build:nav --watch
```

The `--watch` flag rebuilds automatically on save.

### `link()` to a book in another file isn't resolved

**Why:** `build:nav` statically analyzes storybook source. It resolves
`link(settingsBook)` when `settingsBook` is a `book(...)` defined **in the same
file**; a `book` imported from another module is not followed (it's reported as a
`bad-link`).

**Fix:** define linked sub-books in the same storybook file (as local `const`s),
or inline them. (Cross-file imported-book links are a known limitation.)

## TypeScript

### `Cannot find module './tokens.json'` / JSON import error

**Why:** importing `tokens.json` needs `resolveJsonModule`.

**Fix:** ensure your `tsconfig.json` has:

```json
{ "compilerOptions": { "resolveJsonModule": true } }
```

Scaffolded apps already set this.

### `nav.turnTo('x', …)` or `nav.params<'x'>()` is a type error

**Why:** typed navigation is keyed by your **route map**. `useNav()` without your
`AppRoutes` type doesn't know your page names/params.

**Fix:** parameterize the hook with the generated route map, and key `params` by
the route name:

```ts
import { useNav } from '@sublime-ui/ui/navigation';
import type { AppRoutes } from '../navigation';

const nav = useNav<AppRoutes>();
const { id } = nav.params<'task'>();      // params for the 'task' route
nav.turnTo('task', { id: 1 });             // params required exactly when declared
```

An unknown page name or wrong params is a **compile-time** error — that's the
feature working, not a bug.

## Desktop

### `useNative('x')` returns `null`

**Why:** native services only exist on the desktop (Electron) target. On web and
mobile, `useNative` returns `null` by design so the same screen runs everywhere.

**Fix:** guard the call — `const greeter = useNative<…>('greeter'); greeter?.hello()`.
If it's `null` *on desktop too*, confirm the service is registered in the main
process via `registerNative([...])`.

### Renderer build fails importing `@sublime-ui/desktop`

**Why:** the root entry pulls in node/electron and must not enter the renderer
bundle.

**Fix:** import renderer-side code from the renderer-safe subpath:

```ts
import { useNative } from '@sublime-ui/desktop/client';  // not '@sublime-ui/desktop'
```

## Mobile (offline Android build)

### `sublime doctor` shows JDK 17 ✗

**Fix:** on Windows, run `sublime setup` (installs a portable Temurin JDK 17 into
`~/.sublime/` without touching your system Java). On macOS/Linux, install Temurin
17 and set `JAVA_HOME`.

### Build fails on `Failed to install … ndk;…` / `cmake;…`

**Why:** a missing Android SDK component.

**Fix:** usually auto-healed (the build parses the id, installs it, and retries up
to 4 times). If it persists, confirm `ANDROID_HOME` is set and writable.

## Still stuck?

- Re-run `sublime doctor` to check your toolchain.
- Search or open an issue: https://github.com/sublime-ui/sublime-ui/issues
