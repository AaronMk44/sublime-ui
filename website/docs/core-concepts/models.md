---
title: Models
sidebar_position: 2
---

# Models

A **Model** is how Sublime UI thinks about your data. If you've used Laravel's
Eloquent, it will feel familiar: you declare a class **once** — its fields, its
resource, its casts — and that single declaration becomes the home for reading,
writing, and caching that data everywhere your app runs.

You don't wire up stores, reducers, or fetch calls by hand. Calling
`registerModel` connects the Model to a **Gateway** (where the data actually
lives, e.g. an API) and auto-generates a **Redux slice** behind the scenes. The
Model is the surface you work with; the plumbing stays out of sight.

Once registered, you talk to your data through expressive commands —
`all()`, `find()`, `save()`, `delete()` — and read it **reactively** in
components with `rxAll()` / `rxFind()`. The reactive reads serve **cache-first**:
they hand back whatever is already loaded immediately, then fetch in the
background when something is missing or stale.

```ts
import { Model, registerModel } from '@sublime-ui/framework';

export class User extends Model {
  protected static resource = '/users';
  declare id: number;
  declare name: string;
}
registerModel(User);

// Anywhere in your app:
const user = await User.find(1);   // command
const users = User.rxAll();        // reactive, cache-first
```

The same Model works unchanged on mobile, web, and desktop — that's the
"declare once" promise applied to your data layer.

To go deeper — Gateways, casts, the generated slice, and the full command and
reactive-read surface — see the [Framework overview](/docs/framework/overview).
