# Sublime UI — Framework App-Architecture Core (#2) — Design

Date: 2026-06-18
Status: Draft (pending written-spec review)

## 1. Program context

**Sublime UI** is a TypeScript-only, cross-platform application-development
framework — "write the non-UI parts once, run on mobile / web / desktop." This
is sub-project **#2: `@sublime-ui/framework` — the app-architecture core**: the
runtime primitives every Sublime app is written against. It depends only on #0
(monorepo foundation, done). #3 (devkit code generators) scaffolds concrete
models on top of these primitives; #5 (UI + web↔desktop sync) relies on the
store being plain JSON.

### The one idea

A **Model-centric architecture inspired by Laravel/Eloquent** that abstracts
**Redux and API calls** behind `Model` classes. The developer writes models;
the framework handles HTTP, caching in Redux, and casting. The goal is elegant,
beautiful syntax and the best possible developer experience:

```ts
await User.all();                  // fetch + cache in Redux
const users = User.rxAll();        // reactive, cache-first read → User instances
users.where('hasExpiredLicence', true).sortBy('name');
```

### Prior art it codifies

The proven pattern in the Gulani Stores mobile app: `Entities` (plain
interfaces + an `ApiResponse<T>` envelope), static-class `Services` that own
`fetch`, per-domain Redux slices, and a data-loader hook that dispatches
`Service → slice`. #2 keeps the *shape* of that flow (Redux is the source of
truth) but collapses the boilerplate into a single `Model` abstraction and
fixes the smells (372-line mega data-loader hook, hand-rolled `fetch` in every
method, ~50-line hand-written slices).

## 2. Vocabulary (and the freed-up "Service")

| Term | Role |
|---|---|
| **`Model`** | Base class. A *parent/aggregate* entity (e.g. `Sale`, `User`) extends it. Owns a `static schema` (fields + types in one block) + `resource`, exposes CRUD + reactive reads + custom calls. |
| **value type** | A *child* entity (e.g. `SaleItem`) stays a plain `interface` — just a data shape, no Model, no Gateway, no slice. |
| **`Gateway`** | Generated, **API-only** layer: CRUD methods over the fetch-based HTTP client. Its only job is HTTP. (`UserGateway`.) This is the renamed data-access layer. |
| **`Service`** | **Reserved** for optional, hand-written **business logic** (cross-model orchestration). Never required by the framework. |
| **slice** | Generated Redux slice that **auto-registers** into the store and holds the model's cached data as plain JSON. |
| **HTTP client** | A thin wrapper over the native **`fetch`** API. Injects base URL, auth token, JSON headers, `ApiResponse` parsing, and `ApiError` normalization once. |

## 3. Public API (the developer-facing surface)

### 3.1 Defining a model

Fields and their types are declared **once**, together, in a `static schema`
block. `t<T>()` is a zero-runtime phantom: the object **key** is the persisted
field name, the **generic** is the field's type.

```ts
import { Model, t, type Infer } from '@sublime-ui/framework';
import type { SaleItem } from './SaleItem'; // value type, plain interface

export class Sale extends Model {
  protected static resource = '/sales';
  protected static schema = {
    id:        t<number>(),
    storeId:   t<number>(),
    total:     t<number>(),
    createdAt: t<string>(),
    items:     t<SaleItem[]>(),   // arrays / custom types are fine
  } as const;

  // custom getter — computed on the instance, never stored
  get isLarge(): boolean {
    return this.total > 1000;     // this.total: number ✓
  }

  // custom data call: declare URL + whether the result lands in Redux
  static topSellers(storeId: number) {
    return this.call<Sale[]>({ url: `/sales/top/${storeId}`, store: true });
  }
  static dailyReport(storeId: number) {
    return this.call<ReportDto>({ url: `/sales/report/${storeId}`, store: false });
  }
}
// Companion line: merges the inferred field types onto the instance.
// `sublime make:model` (#3) writes this automatically; hand-written models add it once.
export interface Sale extends Infer<typeof Sale.schema> {}
```

- **`resource`** — the RESTful base path; the `Gateway`'s CRUD endpoints derive
  from it (`GET /sales`, `GET /sales/:id`, `POST /sales`, `PUT /sales/:id`,
  `DELETE /sales/:id`).
- **`schema`** — the single source of fields + types. Runtime
  `fillable = Object.keys(schema)`; **only schema fields are cast to the store**.
  Getters and non-schema instance state are never persisted.
- **`t<T>()`** — phantom type marker (no runtime cost). **`Infer<typeof X.schema>`**
  maps the schema to `{ field: Type }` for the companion `interface` merge.
- A class's `static` members cannot type `this`, which is why the one-line
  `interface Sale extends Infer<typeof Sale.schema> {}` is required for
  `this.total` to be typed inside getters/methods. Static methods (`all`, `find`,
  `rxAll`, …) return the subclass via polymorphic `this` typing — no generic
  parameter on `Model` is needed.

### 3.2 Commands (imperative, async, throw `ApiError`)

```ts
await Sale.all(/* optional query params */);   // GET /sales        → cache
await Sale.find(1);                            // GET /sales/1      → cache
const s = new Sale({ storeId, total });
await s.save();                                // POST or PUT       → upsert cache
await s.delete();                              // DELETE            → remove from cache
await Sale.topSellers(storeId);                // custom, store:true
const report = await Sale.dailyReport(storeId);// custom, store:false → returned to caller
```

Every command returns a `Promise` and **rejects with `ApiError`** on failure;
wrap in `try/catch`. Commands that `store` resolve to the hydrated model(s) for
convenience *and* update the cache.

### 3.3 Reactive reads (`rx` prefix, cache-first, auto-fetch)

```ts
const users = User.rxAll();        // reactive ModelCollection<User>
const user  = User.rxFind(id);     // reactive User | null

if (users.loading) return <Spinner/>;
if (users.error)   return <ErrorView error={users.error} onRetry={users.refetch} />;
return users.where('hasExpiredLicence', true).sortBy('name').map(renderRow);
```

- `rxAll()` returns the **cached** instances from Redux, **reactively** (a React
  hook under the hood; re-renders on store change). If the model's slice status
  is `idle` (never loaded), it triggers `User.all()` **once**, then serves cache.
- The returned **`ModelCollection<T>`** is array-like and also carries
  `loading`, `error`, and `refetch()`, plus collection helpers
  (`where`, `whereIn`, `find`, `first`, `sortBy`, `map`, `filter`, `length`).
- `User.all()` (no `rx`) always forces a fresh fetch and updates the cache.

### 3.4 The one primitive: `this.call`

```ts
protected static call<T>(config: {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; // default GET
  body?: unknown;
  store?: boolean;        // default false for custom calls; CRUD sets true
  // how to merge a stored result into the slice:
  merge?: 'replace' | 'upsert' | 'remove'; // default 'replace' for collections
}): Promise<T>;
```

`store: true` → cast the response to model instance(s) and dispatch into the
slice (`replace`/`upsert`/`remove`); `store: false` → cast and **return to the
caller without touching Redux**. CRUD methods are thin wrappers over `call`.

## 4. Internal components (each a focused unit)

```
framework/src/
  model/
    Model.ts            # base class: schema, resource, CRUD, call(), rx hooks, casting
    schema.ts           # t<T>() phantom marker + Infer<> mapped type
    ModelCollection.ts  # array-like + where/sortBy/find + loading/error/refetch
    cast.ts             # schema fields ⇄ plain JSON ⇄ instance (pure)
  gateway/
    Gateway.ts          # base CRUD gateway over the HTTP client (resource → endpoints)
    http.ts             # fetch wrapper: baseURL + auth + JSON + ApiResponse parse
    ApiError.ts         # typed error { status, message, errors, url }
  store/
    registry.ts         # reducer registry; slices self-register here
    store.ts            # configureStore over the dynamic combined reducer
    createModelSlice.ts # slice factory: { items, activeId, status, error } + reducers
    hooks.ts            # typed useAppDispatch / useAppSelector
  discovery/
    registry.ts         # Model → { gateway, slice } registration + lookup
  config/
    Config.ts           # injected: baseURL, tokenProvider, storageAdapter, platform
  entities/
    ApiResponse.ts      # { success, message, data, errors }
  index.ts              # public exports (Model, t, Infer, Config, ApiError, store bootstrap)
```

### 4.1 Casting (`cast.ts`) — keeps Redux serializable

- `fillable(ModelClass)` → `Object.keys(schema)`, the persisted field names.
- `toPlain(model)` → a plain object of just the schema fields (what the store
  holds).
- `hydrate(ModelClass, plain)` → a new instance with schema fields assigned;
  getters/methods come from the prototype.
- **Redux only ever stores `toPlain` output.** Instances are ephemeral views
  created on read. This satisfies Redux's serializable-state contract and keeps
  the store JSON-syncable for #5. This is non-negotiable and verified by a test
  asserting no class instances reach the store.

### 4.2 Auto-registering slice (`store/`)

- `createModelSlice(name, { idKey })` returns a slice with state
  `{ items: PlainEntity[], activeId, status: 'idle'|'loading'|'success'|'error', error: ApiError|null }`
  and reducers `setItems` (replace), `upsertItem`, `removeItem`, `setActive`,
  `setStatus`, `setError`, `reset`.
- On import, the generated slice calls `registry.register(name, reducer)`; the
  store is built from the registry via `combineReducers`, and new reducers are
  injected with `store.replaceReducer`. Importing a model (which imports its
  slice) is enough to wire it in — no central store-config edits.

### 4.3 Gateway + HTTP client (`gateway/`)

- `http` wraps **`fetch`**: prepends `Config.baseURL`, attaches
  `Authorization: Bearer <token>` from `Config.tokenProvider()`, sets JSON
  headers, parses the body as `ApiResponse<T>`, and throws **`ApiError`** when
  `!response.ok` or `ApiResponse.success === false`.
- `Gateway` derives the five CRUD calls from a `resource` path; a model may
  point at a custom `Gateway` subclass for non-standard endpoints (escape
  hatch). Direct `http.raw()` is available for uploads/streaming.

### 4.4 Discovery (`discovery/registry.ts`)

- Maps a `Model` subclass to its `{ gateway, slice }`. The base `Model`
  resolves these at call time so `Sale.all()` knows which gateway to hit and
  which slice to write. Generators register the triple; manual registration is
  also supported for hand-written models.

### 4.5 Config (`config/Config.ts`) — the platform seam

Injected once at app bootstrap so the core stays platform-agnostic (no RN- or
DOM-specific imports in `framework/`):

```ts
configureSublime({
  baseURL: 'https://api.example.com/v2',
  tokenProvider: () => AccessToken.get(),     // async; app supplies storage
  storageAdapter: asyncStorageAdapter,        // get/set/remove; platform-specific
  platform: 'mobile' | 'web' | 'desktop',
});
```

Mobile supplies an AsyncStorage-backed adapter, web/desktop a localStorage/
Electron one. The framework never imports them directly.

## 5. Error handling

- **`ApiError`** = `{ status: number; message: string; errors: unknown; url: string }`.
- The HTTP client throws `ApiError` on network failure, non-2xx, or
  `success === false`. `Gateway`/`call`/all CRUD commands propagate it.
- **Visible, never swallowed:** the framework logs every `ApiError` (console in
  dev; pluggable reporter via Config later) *and* writes it to the model's slice
  `error` so `rx` consumers see `collection.error`.
- Imperative commands (`Sale.all()`, `save()`, custom `call`) **reject**, so
  callers `try/catch`. `rx` reads surface the same error reactively and offer
  `refetch()`.

## 6. Cross-platform

The core is plain **TypeScript + React + Redux Toolkit** — no React Native or
DOM imports. Platform differences (token storage, persistence) enter only
through `Config` adapters. `rx` reads are React hooks (mobile RN, web/desktop
React) so the same model code runs everywhere. UI rendering is #4/#5, not here.

## 7. Scope boundaries (YAGNI)

**In #2:** `Model`, `ModelCollection`, casting, `Gateway` + `http` + `ApiError`,
`createModelSlice` + reducer registry + dynamic store + typed hooks, discovery
registry, `Config`, `ApiResponse`. Hand-written-model path works end to end.

**Not in #2:**
- The `sublime make:model` **generator** that emits Model+Gateway+slice — that
  is **#3**. #2 must make a *hand-written* model fully functional; #3 automates
  the boilerplate.
- UI components, theming, screens — **#4/#5**.
- Offline-first/sync queue, optimistic updates, normalized relations, pagination
  helpers, staleness/TTL refetch — **future**. v1 cache rule is simply
  "fetch when `idle`; `all()` forces refresh."
- Business-logic `Service` examples — app-owned; the framework only reserves the
  name.

## 8. Testing

TDD on the pure/deterministic units, fed realistic inputs:
- `schema.ts` / `cast.ts` — `t<T>()`/`Infer<>` type behavior; `toPlain`/`hydrate`
  round-trips; `fillable = Object.keys(schema)` filtering; getters not persisted;
  **no class instance reaches the store** (assert on dispatched payloads).
- `ModelCollection` — `where`/`whereIn`/`sortBy`/`find`/`first` over fixtures.
- `createModelSlice` — `setItems`/`upsert`/`remove`/`setActive`/status/error.
- `registry` (store + discovery) — register/lookup; `replaceReducer` injection.
- `http`/`ApiError` — parse `ApiResponse`; throw on non-2xx / `success:false` /
  network error (mock `fetch`).
- `Model` CRUD + `call` — with a mock gateway/http: `all/find/save/delete`
  dispatch correctly, `store:false` passthrough does **not** touch the slice,
  errors reject as `ApiError`.
- `rxAll`/`rxFind` — with a test store + React testing: cache-first, auto-fetch
  on `idle`, reactive update, `loading`/`error` surfaced. (Glue lightly tested.)

A small **example model** (`User`) exercised end to end against a mock HTTP
layer is the integration proof, mirroring how #1 used `sandbox/DemoApp`.

## 9. Acceptance criteria

- A hand-written `User extends Model` with a `static schema` + `resource` (and
  the companion `interface User extends Infer<typeof User.schema> {}`) supports:
  `User.all()`, `User.find()`, `save()`, `delete()`, a custom `store:true` call,
  and a custom `store:false` passthrough — all typed, all `ApiError`-rejecting.
- `User.rxAll()`/`rxFind()` return hydrated instances reactively, fetch on
  `idle`, and expose `loading`/`error`/`refetch`.
- The Redux store contains **only plain JSON** for model data (verified by test).
- Slices auto-register; no manual store wiring needed to add a model.
- `npm run typecheck`, `lint`, `test`, `build` green across the monorepo;
  strict TS throughout; core has no RN/DOM imports.
