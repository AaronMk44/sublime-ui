---
sidebar_position: 1
title: Why Sublime UI
---

# Why Sublime UI

Most cross-platform frameworks ask you to give something up: a real native UI, full
type-safety, or the ability to use the platform's own APIs. Sublime UI is built
around a different bet — that the things which make cross-platform development
painful can be moved to **compile time**, generated per platform, and verified by
the type system.

This page walks through the deliberate advancements the framework makes. For each
one: **what** Sublime does, **why** it does it (the problem it removes), and the
**DX win** you get in return.

---

## 1. Compile-time over runtime

**The pain it removes.** In a typical app, your navigation graph and your bridge to
native code are assembled at runtime. The compiler can't see them, so a renamed
route or a mistyped param is a runtime crash, not a red squiggle. You also pay a
"lowest common denominator" tax: a single runtime abstraction has to behave the
same everywhere, so it can't emit idiomatic React Navigation on mobile *and*
react-router on web.

**What Sublime does.** Navigation and the native bridge are **generated and
validated ahead of time**. You author navigation as a typed "storybook"; the
`sublime build:nav` step compiles it into real per-platform code plus a typed route
map:

```ts
// sublime build:nav generates, from your storybooks:
//   navigation.native.tsx   — React Navigation (mobile)
//   navigation.web.tsx      — react-router (web)
//   routes.d.ts             — the typed route map turnTo is checked against
//   index                   — barrel exporting the platform-resolved <Navigation/>
```

Because the output is generated, each platform gets **idiomatic, native code** —
not a runtime shim pretending to be both. And because a typed route map falls out
of the same step, the rest of the app gets full types for free.

**The DX win.** Wrong routes and bad params become **compile errors**, the output
is real per-platform navigation, and there's no runtime guesswork to debug.

---

## 2. Model-centric data

**The pain it removes.** Fetching a list of users the "classic" way means a slice, a
set of action types, a thunk, a fetch call, loading/error flags, a normalized cache,
and a selector — repeated for every resource. The interesting part (which data you
need) is buried under boilerplate.

**What Sublime does.** You declare an **Eloquent-style Model**, and one call wires up
everything behind it:

```ts
import { Model, registerModel } from '@sublime-ui/framework';

export class User extends Model {
  protected static resource = '/users';
  declare id: number;
  declare name: string;
  declare role: 'admin' | 'member';
}
registerModel(User);
```

`registerModel(User)` wires a fetch-based **Gateway** (CRUD over `resource`), an
auto-registering **Redux slice**, and a discovery registry — no slice or thunk to
hand-write. Reads are **cache-first and reactive**:

```ts
function UserList() {
  const users = User.rxAll();        // cache-first; fetches + caches if missing
  // ...
}

function Profile({ id }: { id: number }) {
  const user = User.rxFind(id);      // reactive single-record read
  // ...
}
```

Writes and one-off commands are plain async methods that throw `ApiError` on
failure:

```ts
const user = await User.find(1);
user.name = 'Ada';
await user.save();
await user.delete();
```

The store still holds plain JSON (the Model casts on the way in and out via
`hydrate`/`toPlain`), so you keep a serializable Redux state without giving up the
ergonomics of methods on your data.

**The DX win.** You write the data model, not the plumbing. Reactive, cache-first
reads come for free, and the same Model works on every platform.

---

## 3. Platform-native UI, shared building blocks

**The pain it removes.** Many cross-platform toolkits ship a single
lowest-common-denominator widget set, or render everything inside a webview. You
end up fighting the abstraction to get a native-feeling control, and your app never
quite looks at home on either platform.

**What Sublime does.** Components are **real MUI on web and real React Native Paper
on mobile**, selected by **filename resolution** — the bundler picks the right
implementation, sharing one set of types:

```text
Card.tsx          // web → MUI
Card.native.tsx   // mobile → React Native Paper
Card.types.ts     // shared props contract
```

You import `Card` once; on web you get the `.tsx`, on mobile the `.native.tsx`,
both honoring the same `Card.types.ts`. This extends to behavior too — `useNotify()`
is a single call that shows a **toast on web and a snackbar on mobile** via a
per-platform `NotificationHost`.

**The DX win.** Genuinely native UI on each platform (no webview, no
compromise widget set), with one shared props contract so a component "just works"
on both.

---

## 4. Type-safe navigation

**The pain it removes.** String-based navigation is a classic source of runtime
bugs: `navigate('prodct')` typo'd, a screen that needs an `id` called without one,
or a mobile bottom-nav silently overloaded with more tabs than the platform
supports.

**What Sublime does.** You author navigation as a typed **storybook**, declaring
each page (and its params) once:

```ts
// src/navigation/storybook.native.ts
import { book, page, link } from '@sublime-ui/ui/navigation';
import { Home } from '../screens/mobile/Home';
import { ProductDetail } from '../screens/mobile/ProductDetail';
import { settingsBook } from './settings.native';

export default book({
  format: 'bottomNav',                       // mobile: 'drawer' | 'stack' | 'bottomNav' (<= 5 pages)
  pages: {
    home: page(Home, { title: 'Home', icon: 'home' }),
    product: page<{ id: number }>(ProductDetail, { title: 'Product' }),
    settings: link(settingsBook, { title: 'Settings', icon: 'cog' }),
  },
});
```

`page<{ id: number }>(...)` makes the params part of the route's type. `turnTo` is
then checked against the **generated route map**:

```ts
const nav = useNav();

nav.turnTo('product', { id: 1 });   // ok — params match the page declaration
nav.turnTo('product');              // type error — missing required { id }
nav.turnTo('prodct', { id: 1 });    // type error — unknown route name
```

The **format** is validated per platform, too: a mobile book uses
`'drawer' | 'stack' | 'bottomNav'` (and `bottomNav` is capped at 5 pages), a web
book uses `'sidebar' | 'stack' | 'tabs'`. Using a web format in a native book is a
compile error — and vice versa.

**The DX win.** Unknown routes, wrong or missing params, and invalid per-platform
navigation shapes all surface as **type errors before you run the app**.

---

## 5. One secure native bridge

**The pain it removes.** Calling Node or the OS from a desktop app usually means
hand-writing IPC handlers, hoping you remembered to keep `contextIsolation` on, and
being careful never to let a Node dependency leak into the renderer bundle (where it
either breaks the build or becomes a security hole).

**What Sublime does.** You define a native service once, in main-process code that's
free to import Node deps:

```ts
// src/native/printer.service.ts  (main-process only; may import node deps)
import { defineNative } from '@sublime-ui/desktop';

export const printer = defineNative('printer', {
  async print(receipt: Receipt): Promise<void> { /* node code */ },
  async listDevices(): Promise<Device[]> { /* ... */ },
});
export type Printer = typeof printer;
```

```ts
// desktop/src/main/main.ts
registerNative([fs, dialog, shell, clipboard, notifications, printer]);
```

From any screen you reach it through `useNative`, importing only the **type** of the
service so its Node code never enters the web bundle:

```ts
import { useNative } from '@sublime-ui/desktop';
import type { Printer } from '../../native/printer.service';

const printer = useNative<Printer>('printer');   // null on plain web
await printer?.print(receipt);
```

Everything flows over **one generic, audited IPC channel** (`native:invoke`) with
`contextIsolation: true` and `nodeIntegration: false`. The main router **rejects any
`(module, method)` pair that wasn't registered**, and failures surface as a typed
`NativeError`. Because `useNative` returns `null` on web, the **same screen runs
everywhere** — it just no-ops the native call where there's no native host.

**The DX win.** Type-safe native calls over a single secured channel, with Node deps
provably kept out of the renderer, and screens that run unchanged on web and desktop.

---

## 6. Tokens-first theming

**The pain it removes.** Theming a cross-platform app twice — once in MUI's theme
shape, once in Paper's MD3 shape — means two sources of truth that drift apart, and
designers editing style code in two places.

**What Sublime does.** You maintain **one serializable token set**, and the framework
generates both platform themes from it:

```ts
import { generateThemes } from '@sublime-ui/library';

const { paperTheme, muiTheme } = generateThemes(tokens, 'light');
// paperTheme → MD3 (mobile) · muiTheme → web
```

Wrap the app once and read tokens anywhere:

```tsx
<SublimeProvider tokens={tokens}>
  <App />
</SublimeProvider>;

// inside a component:
const tokens = useTokens();
```

Designers and developers edit **tokens**, not per-platform style code — and both
platforms stay in sync by construction.

**The DX win.** One source of truth for design. Edit tokens; get a coherent MUI
theme and a Paper MD3 theme without writing platform-specific style code.

---

## 7. Offline-first tooling

**The pain it removes.** Mobile builds that depend on fetching toolchains, SDKs, or
packages mid-build fail the moment you're on a plane, behind a strict firewall, or
on a flaky connection — exactly when you most want a reliable build.

**What Sublime does.** The **devkit** ships **self-contained CLI workflows**,
including an **offline Android build**:

```bash
sublime build      # offline Android APK
sublime run        # install / launch on a connected device
sublime doctor     # check your environment
```

The same `sublime` CLI scaffolds (`make:model`, `make:component`, `theme:init`),
generates navigation (`build:nav`), and packages desktop (`desktop:dev`,
`desktop:build`) — one tool, end to end.

**The DX win.** A build you can run without a network round-trip, and one CLI that
covers the whole workflow.

---

## 8. One codebase, three platforms

**The pain it removes.** "Cross-platform" too often means maintaining parallel apps
that drift, or accepting a single rendering engine that satisfies no platform fully.

**What Sublime does.** The **core of your app is shared** — models, design-system
components, theme tokens, native service contracts, and business logic all live once:

```text
src/
  components/   # SHARED quartets (Card, Button…)
  models/       # SHARED models
  theme/        # SHARED tokens
  native/       # SHARED native service contracts
  screens/
    web/        # platform-specific
    mobile/     # platform-specific
  navigation/   # storybook.web.ts / storybook.native.ts (+ generated)
```

Only **screens** and each platform's **storybook** are platform-specific — and
**desktop reuses the web UI** (Electron mounts the same web screens), so it's
effectively free once web works.

**The DX win.** Write the hard parts once and run them on mobile, web, and desktop —
keeping native UI per platform without maintaining three apps.

---

> Each advancement above is a single underlying idea applied consistently: move what
> can be known ahead of time to **compile time**, generate **idiomatic per-platform**
> output, and share everything that doesn't have to differ.
