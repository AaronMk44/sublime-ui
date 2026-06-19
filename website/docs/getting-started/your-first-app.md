---
sidebar_position: 2
title: Your First App
---

# Your First App

This walkthrough builds a tiny but real Sublime app end to end: design tokens, a
model, a screen on each platform, navigation authored per platform and compiled,
and live data reads. Every command and API here is real.

## 1. Initialize your theme

Sublime's design system is **tokens-first**: a single serializable
`SublimeTokens` object drives both the web (MUI) and mobile (Paper) themes.

```bash
npx @sublime-ui/devkit theme:init
```

This scaffolds your `theme/` directory with `tokens.json` and a `tokens.ts` that
exports the tokens object.

## 2. Generate a model

Models are the heart of a Sublime app — a Laravel/Eloquent-style data layer.
Generate one with `make:model`:

```bash
npx @sublime-ui/devkit make:model User --fields "name:string"
```

That produces a `User` model under `src/models/`:

```ts
import { Model, registerModel } from '@sublime-ui/framework';

export class User extends Model {
  protected static resource = '/users';
  declare id: number;
  declare name: string;
}
registerModel(User);
```

`registerModel(User)` wires up a fetch-based Gateway (CRUD over `resource`), an
auto-registering Redux slice, and a discovery registry — so the model is ready to
read and write with no extra boilerplate.

## 3. Wrap your app in the provider

`generateThemes` turns your tokens into the per-platform theme objects, and
`<SublimeProvider>` makes them (and `useTokens()`) available everywhere. Wrap your
app's root in it:

```ts
import { SublimeProvider } from '@sublime-ui/library';
import { tokens } from './theme/tokens';

export function App() {
  return (
    <SublimeProvider tokens={tokens}>
      {/* navigation + screens go here */}
    </SublimeProvider>
  );
}
```

## 4. Create a screen for each platform

Screens are platform-specific — one per target. Create a web screen and a mobile
screen that both list users.

```ts
// src/screens/web/Home.tsx
import { Screen, Stack } from '@sublime-ui/ui';
import { User } from '../../models/User';

export function Home() {
  const users = User.rxAll();
  return (
    <Screen>
      <Stack>
        {users.map((u) => (
          <div key={u.id}>{u.name}</div>
        ))}
      </Stack>
    </Screen>
  );
}
```

```ts
// src/screens/mobile/Home.native.tsx
import { Screen, Stack } from '@sublime-ui/ui';
import { Text } from 'react-native-paper';
import { User } from '../../models/User';

export function Home() {
  const users = User.rxAll();
  return (
    <Screen>
      <Stack>
        {users.map((u) => (
          <Text key={u.id}>{u.name}</Text>
        ))}
      </Stack>
    </Screen>
  );
}
```

`User.rxAll()` is a reactive, cache-first hook: it returns whatever is in the
store immediately and fetches over the Gateway if the data is missing.

## 5. Author a storybook per platform

Navigation in Sublime is a **storybook** — a `book` of `page`s, authored
separately for each platform. A mobile book uses mobile formats; a web book uses
web formats. Mixing them is a type error.

```ts
// src/navigation/storybook.native.ts  (mobile)
import { book, page } from '@sublime-ui/ui/navigation';
import { Home } from '../screens/mobile/Home.native';

export default book({
  format: 'bottomNav', // mobile: 'drawer' | 'stack' | 'bottomNav' (<= 5 pages)
  pages: {
    home: page(Home, { title: 'Home', icon: 'home' }),
  },
});
```

```ts
// src/navigation/storybook.web.ts  (web)
import { book, page } from '@sublime-ui/ui/navigation';
import { Home } from '../screens/web/Home';

export default book({
  format: 'sidebar', // web: 'sidebar' | 'stack' | 'tabs'
  pages: {
    home: page(Home, { title: 'Home' }),
  },
});
```

You can type a page's params with `page<Params>(Screen, opts?)`, and nest another
book with `link(book, opts?)`:

```ts
import { book, page, link } from '@sublime-ui/ui/navigation';
import { ProductDetail } from '../screens/mobile/ProductDetail.native';
import { settingsBook } from './settings.native';

export default book({
  format: 'bottomNav',
  pages: {
    home: page(Home, { title: 'Home', icon: 'home' }),
    product: page<{ id: number }>(ProductDetail, { title: 'Product' }),
    settings: link(settingsBook, { title: 'Settings', icon: 'cog' }),
  },
});
```

## 6. Compile your navigation

Storybooks are compiled ahead of time into idiomatic, fully typed navigation:

```bash
npx @sublime-ui/devkit build:nav
```

This generates `navigation.native.tsx` (React Navigation), `navigation.web.tsx`
(react-router), a typed route map (`routes.d.ts`), and an `index` barrel that
exports the platform-resolved `<Navigation/>`.

## 7. Mount the generated navigation

Drop the generated `<Navigation/>` inside your provider:

```ts
import { SublimeProvider } from '@sublime-ui/library';
import { Navigation } from './navigation';
import { tokens } from './theme/tokens';

export function App() {
  return (
    <SublimeProvider tokens={tokens}>
      <Navigation />
    </SublimeProvider>
  );
}
```

At runtime, `useNav()` gives you type-checked navigation: `nav.turnTo('product', { id: 1 })` (params are required exactly when the page declares them), `nav.turnBack()`, `nav.current()`, and `nav.params<T>()`. An unknown page name or wrong params is a compile-time error.

## 8. Read your data

Your screens already call `User.rxAll()`, which is all you need to render a live,
cache-first list of users. The same model also offers async commands when you
need them — `User.all()`, `User.find(id)`, `user.save()`, `user.delete()`, and
`User.call(...)` for custom endpoints (these throw `ApiError` on failure).

That's a complete Sublime app: shared tokens and model, a screen per platform,
compiled navigation, and reactive data — ready to run on web, mobile, and desktop.
