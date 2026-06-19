---
sidebar_position: 3
title: Coming from Flutter
---

# Coming from Flutter

Flutter gives you a single, consistent rendering engine, a rich widget catalogue,
and excellent performance across platforms — all in Dart. Sublime UI makes a
different bet: stay in **TypeScript**, render with the **real native UI libraries**
of each platform, and share a single data model across mobile, web, and desktop.
This page maps Flutter concepts onto Sublime's so you can weigh that trade honestly.

## Concept map

| Flutter | Sublime UI |
| --- | --- |
| Dart | TypeScript only |
| Flutter engine renders every pixel (Skia / Impeller) | Real native libraries render: MUI on web (real DOM), React Native Paper on mobile; desktop reuses the web UI |
| Widgets (`StatelessWidget` / `StatefulWidget`) | React components, resolved per platform by filename (`Card.tsx` / `Card.native.tsx`) |
| `setState`, `InheritedWidget`, Provider / Riverpod / Bloc | React hooks + a `Model` layer over Redux Toolkit; reactive `rxAll()` / `rxFind()` hooks |
| `ThemeData` / Material 3 theming | Tokens-first `SublimeTokens` → `generateThemes()` → MD3 Paper theme + MUI theme |
| `Navigator` / `go_router` | Compile-time "storybook" → generated React Navigation + React Router with a typed route map |
| Platform channels (`MethodChannel`) | `defineNative` / `useNative<T>()` typed native bridge (desktop) |
| `http` package + your state solution | `Model` classes: `User.all()`, `User.find(id)`, `user.save()` over a fetch Gateway |

## What feels familiar

- **Declarative, composable UI.** React's component tree is conceptually close to
  Flutter's widget tree — small pieces composing into screens.
- **A first-class theming/design-token story.** If you liked driving the look of an
  app from `ThemeData`, Sublime's tokens-first approach will feel natural: one
  serializable `SublimeTokens` object generates both themes.
- **One codebase, many targets.** Like Flutter, Sublime spans mobile, web, and
  desktop from a shared core — the difference is *how* it renders.

## What's different (and why it helps)

### Real native UI libraries instead of a custom engine

Flutter's strength is that it owns the pixels: identical rendering everywhere, and
no dependency on the host platform's widget quirks. Sublime takes the opposite
approach on purpose — it composes the platform's *own* UI libraries:

- **Web:** genuine MUI components on the real DOM. Native accessibility, native text
  selection, native form behavior, and CSS-based ergonomics come for free.
- **Mobile:** genuine React Native Paper (Material Design 3) on native views.
- **Desktop:** the web UI packaged in Electron — no separate desktop screens.

The win is that you live inside the web platform and each OS's real toolkit rather
than a self-contained canvas. The cost is that you accept each platform's rendering
characteristics instead of one engine guaranteeing pixel-identical output.

### Theming through serializable tokens

```ts
// a serializable tokens object drives both platforms
const { paperTheme, muiTheme } = generateThemes(tokens, mode);
```

Wrap the app in `<SublimeProvider tokens={tokens}>` and read tokens anywhere with
`useTokens()`. One source of truth produces an MD3 Paper theme for mobile and an MUI
theme for web — conceptually similar to centralizing on `ThemeData`, but spanning
two real toolkits.

### One Model across targets, instead of per-app data plumbing

Where a Flutter app typically pairs the `http` package with Riverpod/Bloc and
hand-written repositories, Sublime gives you an Eloquent-style model:

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

`registerModel(User)` wires a fetch Gateway over `/users`, a Redux slice, and a
discovery registry. Screens consume it reactively with `User.rxAll()` /
`User.rxFind(id)` (cache-first), and use `user.save()` / `user.delete()` for
mutations. The same model serves mobile, web, and desktop unchanged.

### Native access through a typed bridge

Flutter's platform channels are flexible but stringly-typed at the boundary. Sublime's
desktop bridge is typed end to end:

```ts
// main process only — may import node deps
export const printer = defineNative('printer', {
  async print(receipt: Receipt): Promise<void> { /* node code */ },
});
export type Printer = typeof printer;
```

```ts
// a screen (renderer) — import TYPE only, so node deps stay out of the bundle
const printer = useNative<Printer>('printer'); // null on plain web
await printer?.print(receipt);
```

The main-process router rejects any `(module, method)` that isn't registered, and
errors surface as a typed `NativeError`.

## What you give up / when not to use Sublime

- **Rendering consistency and raw performance.** Flutter's owned engine delivers
  pixel-identical UI and excellent, predictable performance — especially for
  animation-heavy or highly custom-drawn interfaces. Sublime inherits each
  platform's rendering behavior, which means more per-platform variation.
- **A mature, cohesive toolchain.** Flutter's tooling, widget catalogue, and DevTools
  are deep and well-integrated. Sublime is younger and leans on the broader React
  ecosystem rather than a single vendor's stack.
- **Custom-canvas and game-like UIs.** If your app is essentially a custom-drawn
  canvas (rich graphics, bespoke motion), Flutter's engine is the better fit.
- **You'd have to adopt TypeScript/React.** If your team is invested in Dart and
  happy there, that's a real cost to switch.

Sublime's sweet spot is the inverse of Flutter's: teams who *want* to stay on the web
platform and TypeScript, want genuine native-library look-and-feel per platform, and
value a single shared model layer across mobile, web, and desktop more than a single
unified render engine.
