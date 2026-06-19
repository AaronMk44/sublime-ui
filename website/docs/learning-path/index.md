---
sidebar_position: 1
title: Learning Path
---

# Learning Path

Sublime is one TypeScript codebase that spans **mobile, web, and desktop** — real platform-native UI (MUI on web, React Native Paper on mobile), a Laravel/Eloquent-inspired Model layer on the frontend, and navigation plus a native bridge that are generated and type-checked at compile time.

This path takes you from your first Model to a packaged desktop app in three stages. Each stage tells you what you'll be able to build by the end and what to learn next. Work through them in order — every stage builds on the one before it.

---

## Foundations (Beginner)

**Goal:** stand up a Sublime workspace, model your data, theme the app, and render reactive screens.

### The mental model

A Sublime app is **one workspace** with a clear split:

- **Shared core** — `components/`, `models/`, `theme/`, and native service contracts. Written once, used everywhere.
- **Per-platform screens** — `screens/web/` and `screens/mobile/`, plus each platform's navigation. Desktop reuses the **web** UI; there are no separate desktop screens.

Start with the [Framework Overview](/docs/framework/overview) and [Your First App](/docs/getting-started/your-first-app) to see the layout end to end.

### Skills you'll learn

- **Define a Model.** Extend `Model`, declare fields with `declare`, point `resource` at the REST collection, then call `registerModel(User)`. Registration wires a fetch Gateway (CRUD over `resource`), an auto-registering Redux slice, and a discovery registry.

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

- **Read data two ways.** Use the async commands `User.all()` and `User.find(id)` when you need a promise (they throw `ApiError` on failure), and the reactive hooks `User.rxAll()` / `User.rxFind(id)` inside React components — these are cache-first and fetch-and-cache when data is missing.
- **Theme with tokens.** Author a serializable `SublimeTokens` object, wrap the app in `<SublimeProvider tokens={tokens}>`, and read tokens anywhere with `useTokens()`. Tokens generate a Paper theme (mobile) and a MUI theme (web) from one source.
- **Use components.** Drop in library components (`AppBar`, `GlassAppBar`, and ~21 others). The bundler resolves each one per platform by filename, so you import once and get the native widget on each target.
- **Notify the user.** Call `useNotify()` — the same call raises a snackbar on mobile and a toast on web.

**Concepts & APIs:** `Model`, `registerModel`, `declare` fields, `resource`, `all()` / `find()` / `rxAll()` / `rxFind()`, `ApiError`, `SublimeTokens`, `<SublimeProvider>`, `useTokens()`, `useNotify()`.

**Docs:** [Framework Overview](/docs/framework/overview) · [Library Overview](/docs/library/overview) · [Your First App](/docs/getting-started/your-first-app)

**By the end** you can scaffold a workspace, define models, read live data into themed, native-looking screens, and surface notifications.

**Next:** learn how to navigate between screens and write the data back.

---

## Building apps (Intermediate)

**Goal:** turn a set of screens into a navigable app per platform, lay out content with primitives, and write/read data including custom endpoints.

### Skills you'll learn

- **Author platform screens.** Web screens live in `screens/web/`, mobile screens in `screens/mobile/`. Shared models, components, theme, and native contracts stay in the core — only the screens and each platform's storybook differ.
- **Compose a storybook.** Describe navigation with `book`, `page`, and `link` from `@sublime-ui/ui/navigation`, authored **separately per platform** (`storybook.web.ts`, `storybook.native.ts`). Mobile formats are `'drawer' | 'stack' | 'bottomNav'` (the latter limited to ≤ 5 pages); web formats are `'sidebar' | 'stack' | 'tabs'`. A mobile book can't use a web format, and vice versa — it's a type error.

  ```ts
  import { book, page, link } from '@sublime-ui/ui/navigation';

  export default book({
    format: 'bottomNav',
    pages: {
      home: page(Home, { title: 'Home', icon: 'home' }),
      product: page<{ id: number }>(ProductDetail, { title: 'Product' }),
      settings: link(settingsBook, { title: 'Settings', icon: 'cog' }),
    },
  });
  ```

- **Compile and navigate.** Run `sublime build:nav` to generate React Navigation (mobile), react-router (web), a typed `routes.d.ts`, and a platform-resolved `<Navigation/>`. At runtime call `const nav = useNav();` then `nav.turnTo('product', { id: 1 })` — typed against the generated route map, so an unknown page name or wrong/missing params is a compile error. Also `nav.turnBack()`, `nav.current()`, `nav.params<T>()`.
- **Lay out screens.** Build with the platform-resolved primitives `Screen`, `Stack`, `Row`, and `Spacer`.
- **Write and delete data.** Use the async instance commands `user.save()` and `user.delete()` (both throw `ApiError` on failure). The store keeps plain JSON via `hydrate` / `toPlain`.
- **Call custom endpoints.** Reach beyond plain CRUD with `Model.call(...)` for endpoints that aren't standard resource routes.

**Concepts & APIs:** `book` / `page` / `link`, mobile vs web formats, `page<Params>` and typed `turnTo`, `link` for nesting books, `sublime build:nav`, `useNav()` (`turnTo` / `turnBack` / `current` / `params`), `Screen` / `Stack` / `Row` / `Spacer`, `save()` / `delete()`, `Model.call(...)`.

**Docs:** [Storybook Navigation](/docs/navigation/storybook) · [Framework Overview](/docs/framework/overview) · [Library Overview](/docs/library/overview)

**By the end** you can ship a real multi-screen app on web and mobile from one shared core — navigable, laid out, and reading and writing data through your models.

**Next:** reach into native capabilities and package the app for the desktop.

---

## Going native & shipping (Advanced)

**Goal:** call native device capabilities through the secure bridge, package a desktop build, produce offline Android builds, and understand where the platform is headed.

### Skills you'll learn

- **Define a native service.** In `src/native/`, declare a service with `defineNative` — main-process code that may import node deps. Export its type so the renderer can import it as a **type only**.

  ```ts
  import { defineNative } from '@sublime-ui/desktop';

  export const printer = defineNative('printer', {
    async print(receipt: Receipt): Promise<void> { /* node code */ },
    async listDevices(): Promise<Device[]> { /* ... */ },
  });
  export type Printer = typeof printer;
  ```

- **Register and consume it.** Register services in the Electron main process with `registerNative([fs, dialog, shell, clipboard, notifications, printer])`, then call from any renderer screen with `useNative<Printer>('printer')` — which is `null` on plain web, so you guard with `printer?.print(receipt)`.
- **Understand the security model.** Everything flows over one generic IPC channel (`native:invoke`). The renderer imports only the `import type` of a service, so node deps never enter the web bundle. The shell runs with `contextIsolation: true` and `nodeIntegration: false`, and the main router rejects any `(module, method)` pair that wasn't registered; failures surface as a typed `NativeError`. Built-in services include `fs`, `dialog`, `shell`, `clipboard`, and `notifications`.
- **Package for desktop with Electron Forge.** Run `sublime desktop:dev` for Forge start with HMR, and `sublime desktop:build` to make Windows/macOS/Linux installers. Desktop renders the **web** UI — no separate desktop screens.
- **Build offline for Android.** Use `sublime build` for an offline Android APK and `sublime run` to install and launch on a connected device.

**Concepts & APIs:** `defineNative`, `registerNative`, `useNative<T>`, the `native:invoke` channel, `contextIsolation` / `nodeIntegration` hardening, `NativeError`, built-in services (`fs` / `dialog` / `shell` / `clipboard` / `notifications`), `sublime desktop:dev` / `desktop:build`, `sublime build` / `run`.

**Docs:** [Native Bridge](/docs/desktop/native-bridge) · [Desktop Overview](/docs/desktop/overview) · [Desktop Packaging](/docs/desktop/packaging)

### Where it's heading

The Gateway is API-only today (REST), with responses shaped as `ApiResponse<T> = { success, message, data, errors }`. A **storage-agnostic DB Gateway** is on the roadmap — the same Model API you already write, backed by either REST or a local database, without changing your screens.

**By the end** you can call native hardware safely from a shared codebase, ship a packaged desktop app, produce offline Android builds, and reason about where Sublime is going next.
