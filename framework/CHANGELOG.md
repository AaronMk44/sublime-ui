# @sublime-ui/framework

## 2.0.0

## 1.0.0

### Minor Changes

- 74e67f7: SP1 — Storage-Agnostic Gateway. `Model` now talks to a pluggable `Gateway`
  interface instead of a hard-wired REST class. Three interchangeable strategies,
  chosen per model:

  - **InMemoryGateway** (the new DEFAULT) — the model's Redux slice is the source
    of truth; zero config, works offline.
  - **HttpGateway** — today's REST behaviour (`registerModel(User, HttpGateway)`).
  - **DbGateway** — local document DB via an injected `DatabaseAdapter`
    (SQLite on desktop/mobile, IndexedDB on web).

  Breaking changes (B1–B9):

  - **B1** default gateway flips REST → InMemory.
  - **B2** `ApiResponse` is now HTTP-internal; gateways return raw `Row`/`Row[]`
    (still exported as `type` for advanced HTTP use).
  - **B3** `ApiError` → `HttpError` (runtime `.name` is now `'HttpError'`; the
    `ApiError` value + type alias is preserved).
  - **B4** `Model` no longer reads `res.data`.
  - **B5** `registerModel` gains the `registerModel(M, GatewayClass, opts?)`
    overload (the old 2-arg `registerModel(M, opts?)` form is preserved).
  - **B6** `Gateway` is now an interface; the REST class is `HttpGateway`.
  - **B7** Config HTTP fields are optional (`baseURL`/`tokenProvider` required only
    for HTTP-backed models; `databaseAdapter` only for DB-backed models).
  - **B8** barrel additions (error tree, gateway types, `Query`,
    `DatabaseAdapter`, `getHttpConfig`/`getDatabaseAdapter`).
  - **B9** `Model.call()` now requires a request-capable gateway (HTTP only);
    on in-memory/DB models it throws `DataError{ code: 'unsupported' }`.

  Migration one-liner: `0.1.x` `registerModel(User)` defaulted to REST; in `0.2`
  that same call is **in-memory** — add the gateway explicitly for a server-backed
  model: `registerModel(User, HttpGateway)`.

## 0.1.3

## 0.1.2

## 0.1.1

### Patch Changes

- c487076: Fix real-app package consumption and add the starter-app generator.

  - **ui, desktop:** emit ESM with explicit `.js` specifiers so the built packages
    resolve under Node's native ESM. (`0.1.0` shipped extensionless relative
    imports that broke any real install with `ERR_MODULE_NOT_FOUND`.)
  - **devkit:** `build:nav` now statically analyzes storybooks via the TypeScript
    compiler API instead of executing them, so it works with storybooks that import
    real `.tsx` screens / `react-native`. The compiled web navigation is emitted as
    `navigation.tsx` (with `navigation.native.tsx` for mobile).
  - **framework:** `registerModel` accepts a `Model` subclass whose `resource` is
    `protected static`.
  - **New:** `npm create @sublime-ui/app` (the `@sublime-ui/create-app` package) and
    `sublime init` scaffold a complete web/mobile/desktop Sublime app from a minimal
    vertical slice, with interactive target selection.
