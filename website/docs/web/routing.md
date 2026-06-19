---
sidebar_position: 3
title: Routing
---

# Routing

On web you never hand-write react-router. You author a **storybook** —
`src/navigation/storybook.web.ts` — and `sublime build:nav` compiles it ahead of
time into `navigation.tsx`, an idiomatic react-router navigator. You author
intent; the build emits the router.

## storybook.web.ts → navigation.tsx

`storybook.web.ts` is a declarative tree of **books** (navigators) and **pages**
(screens), each book carrying a web **print format** — `sidebar`, `stack`, or
`tabs`. It imports your `../screens/web` screens.

```ts
// src/navigation/storybook.web.ts
import { book, page, link } from '@sublime-ui/ui/navigation';
import { TaskList } from '../screens/web/TaskList';
import { TaskDetail } from '../screens/web/TaskDetail';

export default book({
  format: 'sidebar',
  pages: {
    tasks: page(TaskList, { title: 'Tasks' }),
    task: page<{ id: number }>(TaskDetail, { title: 'Task' }),
  },
});
```

Compile it:

```bash
sublime build:nav
```

`build:nav` emits `navigation.tsx` (the react-router navigator) and a typed route
map. The web app mounts the generated `<Navigation>`. Re-run `build:nav` after
**any** navigation change — the compiled file is generated, so you edit the
storybook, not `navigation.tsx`. Validation runs at compile time, so a duplicate
page key or a dangling link fails the build with a clear message.

## Typed `useNav`

Navigate with one typed hook, checked against the generated route map:

```ts
const nav = useNav();
nav.turnTo('task', { id: 1 }); // params required because the page declared them
nav.turnBack();
```

An unknown page name is a **type error**, and params are required exactly when the
target page declares them — so a renamed or removed screen surfaces at compile
time, not at runtime.

## Going deeper

This page covers routing as it applies to the web target. The storybook model —
books, pages, links, print formats, and how the same source compiles to React
Navigation on mobile — is covered in depth in
[Storybook Navigation](../navigation/storybook.md). For the per-target dev loop
and when to re-run `build:nav`, see
[Running Your App](../getting-started/running.md).
