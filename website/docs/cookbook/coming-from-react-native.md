---
sidebar_position: 2
title: Coming from React Native / Expo
---

# Coming from React Native / Expo

You already write components in JSX, manage navigation with React Navigation, and
reach native capabilities through native modules or Expo's module system. Sublime UI
builds on the same React + TypeScript foundation, so much of your muscle memory
carries straight over. What's new is the layer *above* the components: a model-based
data layer, compile-time navigation, and a single codebase that produces a real web
and desktop app — not just a mobile one.

## Concept map

| What you do in RN / Expo | In Sublime UI |
| --- | --- |
| `View` / `Text` + RN Paper or your own components | Tokens-first `@sublime-ui/library` components, resolved per platform |
| One component tree for all platforms | Component **quartet**: `Card.tsx` (web/MUI), `Card.native.tsx` (mobile/Paper), shared `Card.types.ts` — the bundler picks the file |
| React Navigation configured at runtime | A "storybook" authored per platform, compiled by `sublime build:nav` into React Navigation (mobile) + React Router (web) with a typed route map |
| `fetch` + Redux / TanStack Query for server data | `Model` classes with `User.all()`, `User.find(id)`, `user.save()`, and reactive `User.rxAll()` / `User.rxFind(id)` hooks |
| Native modules / Expo modules | `defineNative` on the main process, `useNative<T>()` in screens (desktop bridge) |
| RN Web for "also on web" | Real MUI web build + Electron desktop, sharing the same models and components |

## What feels familiar

- **It's still React.** Components are functions returning JSX; hooks work as you'd
  expect. `User.rxAll()` is just a hook that re-renders when data changes.
- **Navigation concepts map cleanly.** A storybook's `format: 'stack' | 'bottomNav' | 'drawer'`
  mirrors the navigators you already know, and `nav.turnTo(...)` / `nav.turnBack()`
  are the familiar push/goBack.
- **TypeScript end to end.** No new language, no codegen you can't read — the
  generated navigation files are plain React Navigation / React Router.

## What's different (and why it helps)

### Components are platform-resolved, not lowest-common-denominator

Instead of one component that tries to look right everywhere, a Sublime component is
a small **quartet** that shares types and tokens but renders with the *real* native
library on each platform:

```
Card.tsx          // web — renders with MUI
Card.native.tsx   // mobile — renders with React Native Paper
Card.types.ts     // shared prop types
```

The bundler picks the file by platform. You get genuine MUI on the web (real DOM,
real accessibility, real desktop ergonomics) and genuine Paper on mobile — rather
than RN Web approximating web behavior.

### A Model layer instead of hand-rolled data plumbing

Where you'd normally wire `fetch` + Redux slices + selectors per resource, you
declare a model once:

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

`registerModel(User)` wires a fetch-based Gateway over `/users`, an auto-registering
Redux slice, and a discovery registry. In a screen you read data reactively:

```tsx
function UserList() {
  const { data: users } = User.rxAll(); // cache-first; fetches + caches if missing
  return users.map((u) => <Card key={u.id} title={u.name} />);
}
```

Imperative commands are there when you need them — `User.all()`, `User.find(id)`,
`user.save()`, `user.delete()`, and `User.call(...)` for custom endpoints — and they
throw `ApiError` on failure.

### Navigation is typed at compile time

You author a storybook per platform:

```ts
// src/navigation/storybook.native.ts
import { book, page, link } from '@sublime-ui/ui/navigation';
import { Home } from '../screens/mobile/Home';
import { ProductDetail } from '../screens/mobile/ProductDetail';

export default book({
  format: 'bottomNav', // mobile: 'drawer' | 'stack' | 'bottomNav' (<= 5 pages)
  pages: {
    home: page(Home, { title: 'Home', icon: 'home' }),
    product: page<{ id: number }>(ProductDetail, { title: 'Product' }),
  },
});
```

`sublime build:nav` compiles this into `navigation.native.tsx` (React Navigation),
`navigation.web.tsx` (React Router), and a `routes.d.ts` typed route map. At runtime:

```ts
const nav = useNav();
nav.turnTo('product', { id: 1 }); // params required iff the page declared them
```

`turnTo('product')` with no params, or an unknown route name, is a **compile error**
— not a runtime crash you discover in QA.

### One codebase reaches web *and* desktop for real

RN Web is a genuine option for sharing code to the browser, and it works well for
many apps. Sublime's bet is different: the web build is real MUI/DOM, and desktop is
that same web UI packaged in Electron with a typed native bridge:

```ts
// src/native/printer.service.ts (main process only; may import node deps)
import { defineNative } from '@sublime-ui/desktop';
export const printer = defineNative('printer', {
  async print(receipt: Receipt): Promise<void> { /* node code */ },
});
export type Printer = typeof printer;
```

```ts
// any screen (renderer)
import { useNative } from '@sublime-ui/desktop';
import type { Printer } from '../../native/printer.service';
const printer = useNative<Printer>('printer'); // null on plain web
await printer?.print(receipt);
```

Because the renderer imports only `import type` of the service, Node dependencies
never leak into the web bundle.

## What you give up / when not to use Sublime

Be clear-eyed about the trade:

- **Ecosystem maturity.** React Native and especially Expo have a deep, battle-tested
  ecosystem: a huge library of community native modules, OTA updates, EAS build
  infrastructure, and years of production hardening. Sublime is younger and its
  surface area is intentionally smaller.
- **Mobile-only and "native module" needs.** If you need a specific community native
  module on iOS/Android and there's no equivalent, Expo's module ecosystem will get
  you there faster. Sublime's typed native bridge currently targets the **desktop**
  (Electron) shell.
- **Web is a real platform here, not a port.** Because Sublime renders real MUI on
  web rather than RN Web, you maintain web screens separately from mobile screens
  (the storybook and screens are per-platform). That's the cost of true web parity —
  if you only ever ship mobile, that separation is overhead you may not want.
- **If you're shipping iOS/Android only**, a focused Expo app is likely the simpler,
  faster path. Sublime earns its keep when one team needs mobile **and** a
  first-class web and desktop app from a shared core.
