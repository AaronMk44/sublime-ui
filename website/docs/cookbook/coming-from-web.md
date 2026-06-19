---
sidebar_position: 4
title: Coming from React / Next.js (web)
---

# Coming from React / Next.js (web)

Good news: you already know most of Sublime UI. It's React, it's TypeScript, and on
the web it renders with real MUI on the real DOM. What Sublime adds on top is the
ability to ship the *same* app — same models, same components — to **mobile and
desktop**, plus an Eloquent-style data layer and compile-time typed navigation that
replace a lot of the plumbing you'd otherwise hand-write.

## Concept map

| What you do on the web | In Sublime UI |
| --- | --- |
| React components + MUI / your design system | The same React + MUI on web, plus a tokens-first `@sublime-ui/library` that also renders Paper on mobile |
| `fetch` / TanStack Query / Redux slices per resource | `Model` classes: `User.all()`, `User.find(id)`, `user.save()`, reactive `User.rxAll()` / `User.rxFind(id)` |
| React Router / Next.js file routing | A "storybook" compiled by `sublime build:nav` into React Router (web) + React Navigation (mobile), with a typed route map |
| Browser APIs only | A typed native bridge (`defineNative` / `useNative`) when you package for desktop |
| One target: the browser | The same model + components reaching web, mobile, and desktop |

## What feels familiar

- **It's React and TypeScript.** Components, hooks, props, JSX — all the same.
- **The web build is genuinely web.** Real MUI, real DOM, real CSS. There's no
  webview and no custom render engine standing between you and the browser.
- **A theme/token system you'd recognize.** `<SublimeProvider tokens={tokens}>`
  plus `useTokens()` is the familiar provider-and-hook pattern; `generateThemes()`
  produces a real MUI theme for web.

## What's different (and why it helps)

### The Model layer replaces hand-rolled fetch / Redux

On the web you'd typically reach for `fetch` plus TanStack Query or Redux slices, and
write a selector/mutation layer per resource. Sublime gives you an Eloquent-style
model instead:

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
Redux slice, and a discovery registry — so you don't write the slice by hand. In a
component:

```tsx
function UserList() {
  const { data: users } = User.rxAll(); // cache-first; fetches + caches if missing
  return <>{users.map((u) => <Card key={u.id} title={u.name} />)}</>;
}
```

Mutations are plain method calls — `user.save()`, `user.delete()` — and custom
endpoints go through `User.call(...)`. Failures throw `ApiError`. The Gateway is an
API-only layer (REST today; a DB Gateway is on the roadmap).

### Navigation is typed at compile time

You author one storybook per platform and compile it:

```ts
// src/navigation/storybook.web.ts
import { book, page } from '@sublime-ui/ui/navigation';
import { Home } from '../screens/web/Home';
import { ProductDetail } from '../screens/web/ProductDetail';

export default book({
  format: 'sidebar', // web: 'sidebar' | 'stack' | 'tabs'
  pages: {
    home: page(Home, { title: 'Home', icon: 'home' }),
    product: page<{ id: number }>(ProductDetail, { title: 'Product' }),
  },
});
```

`sublime build:nav` generates `navigation.web.tsx` (React Router) and a `routes.d.ts`
typed route map. Then:

```ts
const nav = useNav();
nav.turnTo('product', { id: 1 }); // params required iff the page declared them
```

`turnTo` is checked against the generated route map — an unknown name or a missing
param is a **type error**, not a 404 you find later.

### Real mobile and desktop from the same core

This is the headline difference from a web-only stack. The same models and the same
`@sublime-ui/library` components also drive:

- **Mobile** — React Native + Paper screens (authored per platform, sharing the model
  and component layer).
- **Desktop** — the web UI packaged in Electron, with a typed native bridge for
  Node/OS access:

```ts
// src/native/printer.service.ts (main process only)
import { defineNative } from '@sublime-ui/desktop';
export const printer = defineNative('printer', {
  async print(receipt: Receipt): Promise<void> { /* node code */ },
});
export type Printer = typeof printer;
```

```ts
// a screen (renderer)
import { useNative } from '@sublime-ui/desktop';
import type { Printer } from '../../native/printer.service';
const printer = useNative<Printer>('printer'); // null on plain web
await printer?.print(receipt);
```

Built-in desktop services include `fs`, `dialog`, `shell`, `clipboard`, and
`notifications`. Because the renderer uses `import type`, no Node dependency ever
enters the web bundle.

## What you give up / when not to use Sublime

- **Next.js's web depth.** Next.js is exceptional at *web-specific* concerns: SSR and
  streaming, server components, edge rendering, image optimization, SEO, and ISR.
  Sublime targets cross-platform **apps**, not content-heavy or SEO-critical websites,
  and does not aim to replace that server-rendering depth.
- **If you're building a website, stay on Next.js.** Marketing sites, blogs,
  documentation, e-commerce storefronts — anything where SSR/SEO and the web routing
  model are central — are squarely Next.js territory.
- **Per-platform screens are a real cost.** Web and mobile screens (and each
  platform's storybook) are authored separately. You share models, tokens, and
  components — not the screen layouts. If you only ship web, that structure is
  overhead you don't need.
- **Younger ecosystem.** You trade some of the maturity and library breadth of the
  plain React/Next.js world for Sublime's cross-platform model.

Reach for Sublime when the goal is a single application across **web, mobile, and
desktop** with a shared model and design system — not when the goal is a web-only
site where Next.js's server story is the point.
