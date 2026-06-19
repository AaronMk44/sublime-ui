---
sidebar_position: 1
title: Overview
---

# Framework

`@sublime-ui/framework` is the model-centric data layer. You declare a `Model`
once — its fields, its resource, its casts — and the framework wires a Gateway
(API access) and an auto-registering Redux slice behind it.

```ts
import { Model, registerModel } from '@sublime-ui/framework';

export class User extends Model {
  protected static resource = '/users';
  declare id: number;
  declare name: string;
}
registerModel(User);
```

Read and write through expressive commands — `User.all()`, `User.find(1)`,
`user.save()`, `user.delete()` — and read reactively in components with
`User.rxAll()` / `User.rxFind(id)`, which serve from the cache first and fetch when
needed.

> Full framework docs are being backfilled. This page is a stub.
