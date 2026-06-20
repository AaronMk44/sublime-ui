# SP1 — Storage-Agnostic Gateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `@sublime-ui/framework`'s Model data layer storage-agnostic — one `Gateway` interface with three interchangeable strategies (in-memory default · local DB · REST), document-oriented local persistence (SQLite desktop/mobile, IndexedDB web), and a transport-neutral error model.

**Architecture:** `Model` talks to a `Gateway` interface (Strategy), resolved per-model from the registry and constructed with a `GatewayDeps` bundle (Factory). `InMemoryGateway` (default) uses the Redux slice as its source of truth; `HttpGateway` is the refactored REST class (returns raw rows, throws typed errors); `DbGateway` is one platform-agnostic class delegating to an injected `DatabaseAdapter` port (Bridge/Adapter) whose concrete adapters ship in a new `@sublime-ui/storage` package and are auto-selected by platform (DI). Every gateway mirrors results into the per-model slice, so `rxAll`/`rxFind` are identical across backends. A neutral `Query` object is consumed by in-memory + DB and serialized for REST. Errors are a thrown `DataError` tree; absence (`find`/`show`) returns `null`.

**Tech Stack:** TypeScript (strict), Redux Toolkit, React, Vitest (jsdom for framework, node for storage), tsup, ESLint, Changesets. Local DB: better-sqlite3 (Electron main, via the `@sublime-ui/desktop` native bridge), expo-sqlite (mobile), idb (web/IndexedDB).

**Source spec:** `docs/superpowers/specs/2026-06-20-sublime-ui-storage-agnostic-gateway-design.md` (committed `7fc897c`).

## Global Constraints

*(Every task's requirements implicitly include this section.)*

- **Target version 0.2.0** — pre-1.0, breaking changes allowed. All `@sublime-ui/*` packages are a **fixed** changeset group; the new `@sublime-ui/storage` MUST be added to root `package.json` `workspaces` AND to `.changeset/config.json` `fixed`.
- **Core purity:** `framework/src/**` must contain **zero** native/RN/DOM imports (no `better-sqlite3`/`expo-sqlite`/`idb`/`electron`). Those live only in `@sublime-ui/storage` and `@sublime-ui/desktop`. CI-enforced (Task J4).
- **Contract:** gateway methods return **raw rows** (no `ApiResponse` envelope); `HttpGateway` unwraps internally. `find`/`show` return `T | null` / `Row | null` on genuine **absence**; every real failure **throws** a typed `DataError` (never a silent null). `update` of a missing id throws `NotFoundError` uniformly across all three strategies.
- **Registration:** `registerModel(Model, GatewayClass?, opts?)` — default `GatewayClass` is `InMemoryGateway`; gateways are constructed with a `GatewayDeps` bundle. The 2-arg `registerModel(Model, { idKey })` overload is preserved.
- **Storage:** document-oriented JSON, **no runtime schema** (models stay `declare`-only). SQLite `<resource>(id TEXT PRIMARY KEY, doc TEXT)` + `json_extract`; IndexedDB native object stores keyed by `id`.
- **Adapter selection:** auto by platform via one `createDatabaseAdapter()` (`.web.ts`/`.native.ts` resolution + desktop runtime `getNative('sqlite')` bridge detection).
- **Toolchain (per workspace):** test `vitest run --passWithNoTests`; single file `cd <pkg> && npx vitest run test/X.test.ts`; typecheck `tsc --noEmit`; build `tsup`; lint `eslint src`. Framework tests: `framework/test/` (jsdom, `globals: false` → import test fns from `vitest`; relative imports use `.js`). Storage tests: `storage/test/` (node env).
- **Commits:** conventional messages, **no Claude attribution** of any kind. Commit after each task's final passing step.

## Execution order

Tasks have real dependencies — execute phases in order **A → J**, and tasks within a phase in numeric order. A–G touch only `framework/`; H adds the `@sublime-ui/storage` workspace; I adds desktop SQLite plumbing; J wires integration, conformance, docs, and CI. The default-gateway flip (Phase F) and its test migrations land together so CI never goes red.

## Task index

- **A — Errors:** A1 `DataError` tree · A2 `ApiError`→`HttpError` + shim
- **B — Query:** B1 `Query` types + `normalizeQuery`/`isQuery` · B2 `applyQuery` · B3 `toQueryString`
- **C — Gateway core:** C1 `Gateway` interface + `Row`/`Id` + `isRequestCapable` · C2 `GatewayDeps` + `genId`
- **D — HTTP:** D1 `http.ts` refactor (raw `T`, typed errors) · D2 `HttpGateway` class
- **E — In-memory:** E1 `InMemoryGateway`
- **F — Core wiring:** F1 `Config` (optional HTTP fields, `getHttpConfig`/`getDatabaseAdapter`) · F2 `registerModel` overloads + default · F3 `Model` refactor + slice/collection error typing · F4 barrel `index.ts`
- **G — DB gateway:** G1 `DatabaseAdapter` port + `DbGateway`
- **H — Storage package:** H1 scaffold `@sublime-ui/storage` · H2 `IndexedDbAdapter` · H3 `SqliteAdapter`/`SqliteDriver`/`buildSelect` · H4 `createDatabaseAdapter` resolver + mobile + barrel
- **I — Desktop SQLite:** I1 `@sublime-ui/desktop` `getNative` + `sqlite` service · I2 storage desktop driver + web-resolver bridge branch
- **J — Integration & CI:** J1 cross-backend Query conformance (CI gate) · J2/J2b mixed-backend + id round-trip · J3 changeset + docs + devkit scaffold · J4/J4b core + storage bundle-purity guards

---

### Task A1: DataError tree (errors/ package)

**Files:**
- Create: `framework/src/errors/DataError.ts`
- Create: `framework/src/errors/NetworkError.ts`
- Create: `framework/src/errors/AuthError.ts`
- Create: `framework/src/errors/ValidationError.ts`
- Create: `framework/src/errors/NotFoundError.ts`
- Create: `framework/src/errors/ConfigError.ts`
- Create: `framework/src/errors/StorageError.ts`
- Create: `framework/src/errors/index.ts`
- Test: `framework/test/errors.test.ts`

**Interfaces:**
- Consumes: `Id` (`string | number`) — re-declared locally as a structural type in `NotFoundError.ts` to keep `errors/` free of a `gateway/` dependency (the canonical `Id` lives in `gateway/Gateway.ts`; `NotFoundError.id` is typed `string | number | undefined`, structurally identical).
- Produces: `DataErrorCode` (`'http'|'network'|'auth'|'validation'|'not_found'|'config'|'storage'|'unsupported'|'unknown'`); `DataError` (base: `readonly code: DataErrorCode`, `readonly cause?: unknown`, `constructor(message: string, opts?: { code?: DataErrorCode; cause?: unknown })`); `NetworkError` (`readonly url?: string`); `AuthError` (`readonly status?: number`); `ValidationError` (`readonly fields?: unknown`, reserved); `NotFoundError` (`readonly resource?: string`, `readonly id?: string | number`); `ConfigError`; `StorageError`. All subtypes extend `DataError` directly. Barrel `errors/index.ts` re-exports every class + `DataErrorCode`.

- [ ] **Step 1: Write the failing test**
```ts
// framework/test/errors.test.ts
import { describe, it, expect } from 'vitest';
import {
  DataError,
  NetworkError,
  AuthError,
  ValidationError,
  NotFoundError,
  ConfigError,
  StorageError,
  type DataErrorCode,
} from '../src/errors/index.js';

describe('DataError tree', () => {
  it('DataError is an Error with default code "unknown" and no cause', () => {
    const err = new DataError('boom');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(DataError);
    expect(err.name).toBe('DataError');
    expect(err.message).toBe('boom');
    expect(err.code).toBe('unknown');
    expect(err.cause).toBeUndefined();
  });

  it('DataError honors an explicit code and propagates cause', () => {
    const root = new Error('root');
    const err = new DataError('wrapped', { code: 'storage', cause: root });
    expect(err.code).toBe('storage');
    expect(err.cause).toBe(root);
  });

  it('every subclass is instanceof DataError and instanceof Error (new.target fix)', () => {
    const subclasses: Array<[DataError, DataErrorCode, string]> = [
      [new NetworkError('n'), 'network', 'NetworkError'],
      [new AuthError('a'), 'auth', 'AuthError'],
      [new ValidationError('v'), 'validation', 'ValidationError'],
      [new NotFoundError('nf'), 'not_found', 'NotFoundError'],
      [new ConfigError('c'), 'config', 'ConfigError'],
      [new StorageError('s'), 'storage', 'StorageError'],
    ];
    for (const [err, code, name] of subclasses) {
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(DataError);
      expect(err.name).toBe(name);
      expect(err.code).toBe(code);
    }
  });

  it('NetworkError carries an optional url', () => {
    const err = new NetworkError('offline', { url: 'https://api.example.com/users' });
    expect(err).toBeInstanceOf(DataError);
    expect(err.url).toBe('https://api.example.com/users');
  });

  it('AuthError carries an optional status', () => {
    const err = new AuthError('forbidden', { status: 403 });
    expect(err.status).toBe(403);
  });

  it('ValidationError carries optional fields (reserved for SP3)', () => {
    const err = new ValidationError('invalid', { fields: { title: ['required'] } });
    expect(err.fields).toEqual({ title: ['required'] });
  });

  it('NotFoundError carries optional resource and id', () => {
    const err = new NotFoundError('notes#7 not found', { resource: 'notes', id: 7 });
    expect(err.resource).toBe('notes');
    expect(err.id).toBe(7);
  });

  it('ConfigError and StorageError default to their fixed codes', () => {
    expect(new ConfigError('missing baseURL').code).toBe('config');
    expect(new StorageError('driver failed').code).toBe('storage');
  });

  it('cause propagates through a subclass constructor', () => {
    const root = new Error('disk full');
    const err = new StorageError('insert failed', { cause: root });
    expect(err.cause).toBe(root);
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/errors.test.ts`
Expected: FAIL with "Failed to resolve import '../src/errors/index.js'" (the `errors/` directory does not exist yet).

- [ ] **Step 3: Create the DataError base and subclasses (complete code)**

Create `framework/src/errors/DataError.ts`:
```ts
export type DataErrorCode =
  | 'http'
  | 'network'
  | 'auth'
  | 'validation'
  | 'not_found'
  | 'config'
  | 'storage'
  | 'unsupported'
  | 'unknown';

export interface DataErrorOptions {
  code?: DataErrorCode;
  cause?: unknown;
}

/**
 * Transport-neutral base error. Every real framework data-layer failure is a
 * DataError (or a subclass); absence is never a failure (find/show return null).
 *
 * Uses `new.target.prototype` so subclass `instanceof` works under transpiled
 * `extends Error` targets — fixes the latent bug where a fixed
 * `Object.setPrototypeOf(this, DataError.prototype)` would break subclass checks.
 */
export class DataError extends Error {
  readonly code: DataErrorCode;
  readonly cause?: unknown;

  constructor(message: string, opts: DataErrorOptions = {}) {
    super(message);
    this.name = new.target.name;
    this.code = opts.code ?? 'unknown';
    if (opts.cause !== undefined) this.cause = opts.cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
```

Create `framework/src/errors/NetworkError.ts`:
```ts
import { DataError } from './DataError.js';

export interface NetworkErrorOptions {
  url?: string;
  cause?: unknown;
}

/** Connection-level failure: DNS error, offline, connection refused, fetch reject. */
export class NetworkError extends DataError {
  readonly url?: string;

  constructor(message: string, opts: NetworkErrorOptions = {}) {
    super(message, { code: 'network', cause: opts.cause });
    if (opts.url !== undefined) this.url = opts.url;
  }
}
```

Create `framework/src/errors/AuthError.ts`:
```ts
import { DataError } from './DataError.js';

export interface AuthErrorOptions {
  status?: number;
  cause?: unknown;
}

/** Authentication / authorization failure: HTTP 401 / 403. */
export class AuthError extends DataError {
  readonly status?: number;

  constructor(message: string, opts: AuthErrorOptions = {}) {
    super(message, { code: 'auth', cause: opts.cause });
    if (opts.status !== undefined) this.status = opts.status;
  }
}
```

Create `framework/src/errors/ValidationError.ts`:
```ts
import { DataError } from './DataError.js';

export interface ValidationErrorOptions {
  fields?: unknown;
  cause?: unknown;
}

/** RESERVED for SP3 (per-field server validation). Thrown nowhere in SP1. */
export class ValidationError extends DataError {
  readonly fields?: unknown;

  constructor(message: string, opts: ValidationErrorOptions = {}) {
    super(message, { code: 'validation', cause: opts.cause });
    if (opts.fields !== undefined) this.fields = opts.fields;
  }
}
```

Create `framework/src/errors/NotFoundError.ts`:
```ts
import { DataError } from './DataError.js';

export interface NotFoundErrorOptions {
  resource?: string;
  id?: string | number;
  cause?: unknown;
}

/**
 * Thrown by update-of-missing across all three strategies. NOT thrown by
 * find/show — genuine read absence resolves to null.
 */
export class NotFoundError extends DataError {
  readonly resource?: string;
  readonly id?: string | number;

  constructor(message: string, opts: NotFoundErrorOptions = {}) {
    super(message, { code: 'not_found', cause: opts.cause });
    if (opts.resource !== undefined) this.resource = opts.resource;
    if (opts.id !== undefined) this.id = opts.id;
  }
}
```

Create `framework/src/errors/ConfigError.ts`:
```ts
import { DataError, type DataErrorOptions } from './DataError.js';

/** Missing required configuration: baseURL (HTTP) or databaseAdapter (DB). */
export class ConfigError extends DataError {
  constructor(message: string, opts: Omit<DataErrorOptions, 'code'> = {}) {
    super(message, { code: 'config', cause: opts.cause });
  }
}
```

Create `framework/src/errors/StorageError.ts`:
```ts
import { DataError, type DataErrorOptions } from './DataError.js';

/** DB driver / transport failure: duplicate id, missing JSON1, IPC error. */
export class StorageError extends DataError {
  constructor(message: string, opts: Omit<DataErrorOptions, 'code'> = {}) {
    super(message, { code: 'storage', cause: opts.cause });
  }
}
```

Create `framework/src/errors/index.ts`:
```ts
export { DataError, type DataErrorCode, type DataErrorOptions } from './DataError.js';
export { NetworkError, type NetworkErrorOptions } from './NetworkError.js';
export { AuthError, type AuthErrorOptions } from './AuthError.js';
export { ValidationError, type ValidationErrorOptions } from './ValidationError.js';
export { NotFoundError, type NotFoundErrorOptions } from './NotFoundError.js';
export { ConfigError } from './ConfigError.js';
export { StorageError } from './StorageError.js';
```

- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/errors.test.ts`
Expected: PASS (all 8 cases green).

- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add framework/src/errors framework/test/errors.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "feat(framework): add transport-neutral DataError tree"
```

---

### Task A2: Rename ApiError -> HttpError + back-compat shim

**Files:**
- Create: `framework/src/gateway/HttpError.ts`
- Modify: `framework/src/gateway/ApiError.ts:1-21` (rewrite entire file into a shim)
- Modify: `framework/test/ApiError.test.ts:1-19` (migrate name + add DataError instanceof)
- Test: `framework/test/ApiError.test.ts`

**Interfaces:**
- Consumes: `DataError` (base class from `errors/DataError.ts`); `DataErrorCode`.
- Produces: `HttpError` (`extends DataError`; `readonly status: number`, `readonly url: string`, `readonly errors: unknown`; `code` defaults to `'http'`; `constructor(message: string, opts: HttpErrorOptions)`); `HttpErrorOptions` (`{ status: number; errors: unknown; url: string; cause?: unknown }`). Shim `gateway/ApiError.ts` re-exports `{ HttpError, HttpError as ApiError }` plus type aliases `ApiError = HttpError` and `ApiErrorOptions = HttpErrorOptions`, so `new ApiError(...).name === 'HttpError'` and `instanceof ApiError` keeps working.

> NOTE: `http.ts` still imports `ApiError` from `./ApiError.js` after this task — that import resolves through the shim and keeps compiling/passing. The `http.ts` re-classification (NetworkError / AuthError / ValidationError mapping, raw `T` return) is Phase D and is intentionally NOT done here. This task changes only the error class identity, not call sites.

Current `framework/src/gateway/ApiError.ts` (the file being replaced) is 21 lines: `ApiErrorOptions` interface (lines 1-5), `class ApiError extends Error` with `status`/`errors`/`url` (lines 7-21), `this.name = 'ApiError'` (line 15), and the latent subclass-`instanceof` bug `Object.setPrototypeOf(this, ApiError.prototype)` (line 19). The new `HttpError` extends `DataError` and uses `new.target.prototype` (inherited from the base), curing that bug.

- [ ] **Step 1: Write the failing test (migrate ApiError.test.ts)**
```ts
// framework/test/ApiError.test.ts
import { describe, it, expect } from 'vitest';
import { ApiError } from '../src/gateway/ApiError.js';
import { HttpError } from '../src/gateway/HttpError.js';
import { DataError } from '../src/errors/index.js';

describe('ApiError (back-compat shim for HttpError)', () => {
  it('is an Error/DataError/HttpError carrying status, errors, and url', () => {
    const err = new ApiError('Not found', {
      status: 404,
      errors: { id: ['missing'] },
      url: '/users/1',
    });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(DataError);
    expect(err).toBeInstanceOf(HttpError);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.name).toBe('HttpError');
    expect(err.code).toBe('http');
    expect(err.message).toBe('Not found');
    expect(err.status).toBe(404);
    expect(err.errors).toEqual({ id: ['missing'] });
    expect(err.url).toBe('/users/1');
  });

  it('ApiError is the same value as HttpError', () => {
    expect(ApiError).toBe(HttpError);
  });

  it('HttpError propagates an optional cause', () => {
    const root = new Error('socket hang up');
    const err = new HttpError('upstream failed', {
      status: 502,
      errors: null,
      url: '/users',
      cause: root,
    });
    expect(err.cause).toBe(root);
    expect(err).toBeInstanceOf(DataError);
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/ApiError.test.ts`
Expected: FAIL with "Failed to resolve import '../src/gateway/HttpError.js'" (HttpError does not exist yet; the old `ApiError` also still has `name === 'ApiError'` and is not a `DataError`).

- [ ] **Step 3: Create HttpError and rewrite ApiError into a shim (complete code)**

Create `framework/src/gateway/HttpError.ts`:
```ts
import { DataError, type DataErrorCode } from '../errors/DataError.js';

export interface HttpErrorOptions {
  status: number;
  errors: unknown;
  url: string;
  cause?: unknown;
}

/**
 * "Came over the wire" error: a non-2xx HTTP response (or a malformed one).
 * Extends DataError with HTTP transport details. code defaults to 'http'.
 * Was the framework's former `ApiError` (now a back-compat alias).
 */
export class HttpError extends DataError {
  readonly status: number;
  readonly errors: unknown;
  readonly url: string;

  constructor(message: string, opts: HttpErrorOptions) {
    const code: DataErrorCode = 'http';
    super(message, { code, cause: opts.cause });
    this.status = opts.status;
    this.errors = opts.errors;
    this.url = opts.url;
  }
}
```

Replace the entire contents of `framework/src/gateway/ApiError.ts` (currently lines 1-21) with the shim:
```ts
/**
 * Back-compat shim. `ApiError` was renamed to `HttpError` in 0.2.0; this module
 * re-exports the new class under both names so existing imports and
 * `instanceof ApiError` keep working. The runtime `.name` is now 'HttpError'.
 */
export { HttpError, HttpError as ApiError } from './HttpError.js';
export type { HttpErrorOptions } from './HttpError.js';
export type { HttpErrorOptions as ApiErrorOptions } from './HttpError.js';
import type { HttpError as _HttpError } from './HttpError.js';
export type ApiError = _HttpError;
```

- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/ApiError.test.ts`
Expected: PASS (all 3 cases green; `ApiError` resolves to `HttpError`, `name === 'HttpError'`, `instanceof DataError` holds).

- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add framework/src/gateway/HttpError.ts framework/src/gateway/ApiError.ts framework/test/ApiError.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "refactor(framework): rename ApiError to HttpError with back-compat shim"
```


### Task B1: Query types + normalizeQuery + isQuery

**Files:**
- Create: `framework/src/gateway/Query.ts`
- Test: `framework/test/query.test.ts`

**Interfaces:**
- Consumes: nothing (leaf module — pure types + two pure functions, no framework imports)
- Produces: `type FilterOp = 'eq'|'ne'|'gt'|'gte'|'lt'|'lte'|'in'|'like'`; `type FilterValue = string|number|boolean|null|Array<string|number>`; `interface QueryFilter { field: string; op: FilterOp; value: FilterValue }`; `interface QuerySort { field: string; dir: 'asc'|'desc' }`; `interface Query { filters?: QueryFilter[]; sort?: QuerySort[]; limit?: number; offset?: number }`; `type LegacyQuery = Record<string, string|number|boolean>`; `function normalizeQuery(q?: Query|LegacyQuery): Query|undefined`; `function isQuery(q: unknown): q is Query`

- [ ] **Step 1: Write the failing test**
```ts
import { describe, it, expect } from 'vitest';
import {
  normalizeQuery,
  isQuery,
  type Query,
  type LegacyQuery,
} from '../src/gateway/Query.js';

describe('isQuery', () => {
  it('returns true for a structured Query with filters', () => {
    const q: Query = { filters: [{ field: 'storeId', op: 'eq', value: 7 }] };
    expect(isQuery(q)).toBe(true);
  });

  it('returns true for a structured Query with only sort', () => {
    const q: Query = { sort: [{ field: 'name', dir: 'asc' }] };
    expect(isQuery(q)).toBe(true);
  });

  it('returns true for a structured Query with only limit', () => {
    expect(isQuery({ limit: 10 })).toBe(true);
  });

  it('returns true for a structured Query with only offset', () => {
    expect(isQuery({ offset: 5 })).toBe(true);
  });

  it('returns true for an empty object (treated as empty Query => all rows)', () => {
    expect(isQuery({})).toBe(true);
  });

  it('returns false for a legacy flat record', () => {
    const legacy: LegacyQuery = { storeId: 7 };
    expect(isQuery(legacy)).toBe(false);
  });

  it('returns false for null / undefined / non-objects', () => {
    expect(isQuery(null)).toBe(false);
    expect(isQuery(undefined)).toBe(false);
    expect(isQuery(42)).toBe(false);
    expect(isQuery('storeId')).toBe(false);
  });
});

describe('normalizeQuery', () => {
  it('returns undefined for undefined input', () => {
    expect(normalizeQuery(undefined)).toBeUndefined();
  });

  it('passes a structured Query through unchanged', () => {
    const q: Query = {
      filters: [{ field: 'pinned', op: 'eq', value: true }],
      sort: [{ field: 'title', dir: 'desc' }],
      limit: 5,
      offset: 2,
    };
    expect(normalizeQuery(q)).toEqual(q);
  });

  it('converts a single-key legacy record to an eq filter', () => {
    expect(normalizeQuery({ storeId: 7 })).toEqual({
      filters: [{ field: 'storeId', op: 'eq', value: 7 }],
    });
  });

  it('converts a multi-key legacy record to ANDed eq filters preserving key order', () => {
    expect(normalizeQuery({ storeId: 7, active: true, tier: 'gold' })).toEqual({
      filters: [
        { field: 'storeId', op: 'eq', value: 7 },
        { field: 'active', op: 'eq', value: true },
        { field: 'tier', op: 'eq', value: 'gold' },
      ],
    });
  });

  it('returns an empty Query for an empty legacy record', () => {
    expect(normalizeQuery({})).toEqual({});
  });

  it('treats legacy keys named "limit"/"offset" as eq filters, NOT as pagination (documented unsupported)', () => {
    expect(normalizeQuery({ limit: 10, offset: 5 })).toEqual({
      filters: [
        { field: 'limit', op: 'eq', value: 10 },
        { field: 'offset', op: 'eq', value: 5 },
      ],
    });
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/query.test.ts`
Expected: FAIL with "Failed to resolve import '../src/gateway/Query.js'" (the module does not exist yet)
- [ ] **Step 3: Create `framework/src/gateway/Query.ts` (complete code)**
```ts
/**
 * Backend-neutral query object, consumed by InMemoryGateway + DbGateway and
 * serialized for REST. Pure types + two pure helpers — ZERO framework/native/DOM
 * imports. (SP1 design §6.1.)
 */

export type FilterOp = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like';

export type FilterValue = string | number | boolean | null | Array<string | number>;

/** A single ANDed predicate. For op 'in', `value` is an array. */
export interface QueryFilter {
  field: string;
  op: FilterOp;
  value: FilterValue;
}

export interface QuerySort {
  field: string;
  dir: 'asc' | 'desc';
}

/** All fields optional; an empty Query ({}) means "all rows". */
export interface Query {
  filters?: QueryFilter[]; // ANDed (no OR/grouping in v1 — reserved)
  sort?: QuerySort[]; // applied primary, secondary, …
  limit?: number; // forward-compat for SP5 pagination
  offset?: number;
}

/**
 * Today's flat form (`{ storeId: 7 }`). Each entry becomes an `eq` filter.
 * NOTE: a legacy key literally named `limit` or `offset` is treated as an `eq`
 * FILTER on that field, NOT as pagination — pagination is only reachable through
 * the structured Query. This is documented as unsupported for the legacy form.
 */
export type LegacyQuery = Record<string, string | number | boolean>;

/**
 * Structural discriminator: a value is a structured Query iff it is a plain
 * object whose only own keys are a subset of { filters, sort, limit, offset }.
 * An empty object is a valid (empty) Query. A flat legacy record with arbitrary
 * field keys is NOT a Query.
 */
export function isQuery(q: unknown): q is Query {
  if (q === null || typeof q !== 'object' || Array.isArray(q)) return false;
  const allowed = new Set(['filters', 'sort', 'limit', 'offset']);
  for (const k of Object.keys(q as Record<string, unknown>)) {
    if (!allowed.has(k)) return false;
  }
  return true;
}

/**
 * Normalize either a structured Query or a legacy flat record into a Query.
 * - undefined -> undefined
 * - a structured Query -> returned as-is
 * - a legacy record -> { filters: [{ field, op: 'eq', value }] } in key order;
 *   an empty record -> {} (the empty Query).
 */
export function normalizeQuery(q?: Query | LegacyQuery): Query | undefined {
  if (q === undefined) return undefined;
  if (isQuery(q)) return q;
  const legacy = q as LegacyQuery;
  const filters: QueryFilter[] = Object.entries(legacy).map(([field, value]) => ({
    field,
    op: 'eq' as const,
    value,
  }));
  return filters.length > 0 ? { filters } : {};
}
```
- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/query.test.ts`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add framework/src/gateway/Query.ts framework/test/query.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "feat(framework): add backend-neutral Query types + normalizeQuery/isQuery"
```

---

### Task B2: applyQuery (shared JS evaluator)

**Files:**
- Create: `framework/src/gateway/queryMatch.ts`
- Test: `framework/test/queryMatch.test.ts`

**Interfaces:**
- Consumes: `type Query`, `type QueryFilter`, `type FilterOp`, `type FilterValue` from `Query.js`; `type Row = Record<string, unknown>` (declared locally to avoid importing `Gateway.ts`, which does not yet expose `Row` in Phase B; the local alias is structurally identical and will be unified when `Gateway.ts` is rewritten in Phase D)
- Produces: `function applyQuery(rows: Row[], q: Query): Row[]` — filter (AND, per-op) -> stable multi-key sort (nulls first on asc) -> slice(offset, offset+limit) -> defensive clone

- [ ] **Step 1: Write the failing test**
```ts
import { describe, it, expect } from 'vitest';
import { applyQuery } from '../src/gateway/queryMatch.js';
import type { Query } from '../src/gateway/Query.js';

type Row = Record<string, unknown>;

const rows: Row[] = [
  { id: 1, name: 'Alpha', score: 30, tier: 'gold', active: true },
  { id: 2, name: 'beta', score: 10, tier: 'silver', active: false },
  { id: 3, name: 'Gamma', score: 20, tier: 'gold', active: true },
  { id: 4, name: 'delta', score: null, tier: 'bronze', active: false },
  { id: 5, name: 'Alphabet', score: 20, tier: null, active: true },
];

const ids = (out: Row[]): unknown[] => out.map((r) => r.id);

describe('applyQuery — filter operators', () => {
  it('eq matches exact equality', () => {
    const q: Query = { filters: [{ field: 'tier', op: 'eq', value: 'gold' }] };
    expect(ids(applyQuery(rows, q))).toEqual([1, 3]);
  });

  it('eq with null matches only null values', () => {
    const q: Query = { filters: [{ field: 'score', op: 'eq', value: null }] };
    expect(ids(applyQuery(rows, q))).toEqual([4]);
  });

  it('ne excludes exact equality (and excludes rows equal to value)', () => {
    const q: Query = { filters: [{ field: 'tier', op: 'ne', value: 'gold' }] };
    expect(ids(applyQuery(rows, q))).toEqual([2, 4, 5]);
  });

  it('gt compares numerically, skips null', () => {
    const q: Query = { filters: [{ field: 'score', op: 'gt', value: 20 }] };
    expect(ids(applyQuery(rows, q))).toEqual([1]);
  });

  it('gte compares numerically, skips null', () => {
    const q: Query = { filters: [{ field: 'score', op: 'gte', value: 20 }] };
    expect(ids(applyQuery(rows, q))).toEqual([1, 3, 5]);
  });

  it('lt compares numerically, skips null', () => {
    const q: Query = { filters: [{ field: 'score', op: 'lt', value: 20 }] };
    expect(ids(applyQuery(rows, q))).toEqual([2]);
  });

  it('lte compares numerically, skips null', () => {
    const q: Query = { filters: [{ field: 'score', op: 'lte', value: 20 }] };
    expect(ids(applyQuery(rows, q))).toEqual([2, 3, 5]);
  });

  it('in matches array membership', () => {
    const q: Query = { filters: [{ field: 'id', op: 'in', value: [2, 4] }] };
    expect(ids(applyQuery(rows, q))).toEqual([2, 4]);
  });

  it('in with no array value matches nothing', () => {
    const q: Query = { filters: [{ field: 'id', op: 'in', value: 2 }] };
    expect(ids(applyQuery(rows, q))).toEqual([]);
  });

  it('like is case-insensitive contains', () => {
    const q: Query = { filters: [{ field: 'name', op: 'like', value: 'alph' }] };
    expect(ids(applyQuery(rows, q))).toEqual([1, 5]);
  });

  it('like skips null field values', () => {
    const q: Query = { filters: [{ field: 'tier', op: 'like', value: 'o' }] };
    expect(ids(applyQuery(rows, q))).toEqual([1, 3, 2]);
  });

  it('multiple filters are ANDed', () => {
    const q: Query = {
      filters: [
        { field: 'tier', op: 'eq', value: 'gold' },
        { field: 'active', op: 'eq', value: true },
        { field: 'score', op: 'gte', value: 25 },
      ],
    };
    expect(ids(applyQuery(rows, q))).toEqual([1]);
  });
});

describe('applyQuery — sort', () => {
  it('sorts ascending with nulls first', () => {
    const q: Query = { sort: [{ field: 'score', dir: 'asc' }] };
    expect(ids(applyQuery(rows, q))).toEqual([4, 2, 3, 5, 1]);
  });

  it('sorts descending with nulls last', () => {
    const q: Query = { sort: [{ field: 'score', dir: 'desc' }] };
    expect(ids(applyQuery(rows, q))).toEqual([1, 3, 5, 2, 4]);
  });

  it('applies a stable multi-key sort (primary then secondary)', () => {
    const q: Query = {
      sort: [
        { field: 'score', dir: 'asc' },
        { field: 'name', dir: 'asc' },
      ],
    };
    // score asc: 4(null),2(10),then 3&5 tie at 20 -> name asc 'Gamma' vs 'Alphabet'
    // 'Alphabet' < 'Gamma' -> 5 before 3; then 1(30)
    expect(ids(applyQuery(rows, q))).toEqual([4, 2, 5, 3, 1]);
  });

  it('is stable for equal keys (preserves input order)', () => {
    const q: Query = { sort: [{ field: 'tier', dir: 'asc' }] };
    // tier asc, nulls first: null(5), then bronze(4), gold(1,3 in input order), silver(2)
    expect(ids(applyQuery(rows, q))).toEqual([5, 4, 1, 3, 2]);
  });
});

describe('applyQuery — limit/offset', () => {
  it('applies offset then limit', () => {
    const q: Query = { sort: [{ field: 'id', dir: 'asc' }], offset: 1, limit: 2 };
    expect(ids(applyQuery(rows, q))).toEqual([2, 3]);
  });

  it('applies limit alone', () => {
    const q: Query = { sort: [{ field: 'id', dir: 'asc' }], limit: 2 };
    expect(ids(applyQuery(rows, q))).toEqual([1, 2]);
  });

  it('applies offset alone', () => {
    const q: Query = { sort: [{ field: 'id', dir: 'asc' }], offset: 3 };
    expect(ids(applyQuery(rows, q))).toEqual([4, 5]);
  });

  it('an empty Query returns all rows', () => {
    expect(ids(applyQuery(rows, {}))).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('applyQuery — defensive clone', () => {
  it('returns shallow clones so callers cannot mutate the source rows', () => {
    const src: Row[] = [{ id: 1, name: 'x' }];
    const out = applyQuery(src, {});
    expect(out[0]).not.toBe(src[0]);
    expect(out[0]).toEqual(src[0]);
    (out[0] as Row).name = 'mutated';
    expect(src[0]!.name).toBe('x');
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/queryMatch.test.ts`
Expected: FAIL with "Failed to resolve import '../src/gateway/queryMatch.js'" (the module does not exist yet)
- [ ] **Step 3: Create `framework/src/gateway/queryMatch.ts` (complete code)**
```ts
import type { Query, QueryFilter, FilterValue } from './Query.js';

/**
 * Plain serializable row, structurally identical to gateway/Gateway.ts's `Row`.
 * Declared locally so this evaluator stays a leaf module in Phase B (Gateway.ts
 * is rewritten to export `Row` in Phase D; the alias unifies then).
 */
type Row = Record<string, unknown>;

/**
 * The reference query evaluator, shared by InMemoryGateway and the IndexedDB
 * scan fallback so there is ONE operator-semantics oracle. (SP1 design §6.1.)
 * Pipeline: filter (per-op, ANDed) -> stable multi-key sort (nulls first on asc)
 * -> slice(offset, offset+limit) -> defensive shallow clone.
 */
export function applyQuery(rows: Row[], q: Query): Row[] {
  let out = rows;

  if (q.filters && q.filters.length > 0) {
    const filters = q.filters;
    out = out.filter((row) => filters.every((f) => matchFilter(row[f.field], f)));
  }

  if (q.sort && q.sort.length > 0) {
    const sort = q.sort;
    // Decorate-sort-undecorate to keep the sort stable across engines.
    out = out
      .map((row, i) => ({ row, i }))
      .sort((a, b) => {
        for (const s of sort) {
          const cmp = compareValues(a.row[s.field], b.row[s.field], s.dir);
          if (cmp !== 0) return cmp;
        }
        return a.i - b.i; // stable tie-break by original index
      })
      .map((d) => d.row);
  }

  const offset = q.offset ?? 0;
  if (offset > 0 || q.limit !== undefined) {
    const end = q.limit === undefined ? undefined : offset + q.limit;
    out = out.slice(offset, end);
  }

  // Defensive shallow clone so callers cannot mutate the source rows.
  return out.map((row) => ({ ...row }));
}

function matchFilter(actual: unknown, f: QueryFilter): boolean {
  switch (f.op) {
    case 'eq':
      return actual === f.value;
    case 'ne':
      return actual !== f.value;
    case 'gt':
      return isComparable(actual, f.value) && (actual as number) > (f.value as number);
    case 'gte':
      return isComparable(actual, f.value) && (actual as number) >= (f.value as number);
    case 'lt':
      return isComparable(actual, f.value) && (actual as number) < (f.value as number);
    case 'lte':
      return isComparable(actual, f.value) && (actual as number) <= (f.value as number);
    case 'in':
      return Array.isArray(f.value) && f.value.some((v) => v === actual);
    case 'like': {
      if (actual == null || typeof f.value !== 'string') return false;
      return String(actual).toLowerCase().includes(f.value.toLowerCase());
    }
    default:
      return false;
  }
}

/** Ordered comparisons skip nullish operands (mirrors SQL's NULL semantics). */
function isComparable(actual: unknown, value: FilterValue): boolean {
  return actual != null && value != null;
}

/**
 * Three-way compare honoring direction. Nulls sort FIRST on ascending (and
 * therefore LAST on descending, because the whole comparison is negated).
 */
function compareValues(a: unknown, b: unknown, dir: 'asc' | 'desc'): number {
  const an = a == null;
  const bn = b == null;
  if (an && bn) return 0;
  if (an) return dir === 'asc' ? -1 : 1; // null first on asc
  if (bn) return dir === 'asc' ? 1 : -1;

  let base: number;
  if (typeof a === 'number' && typeof b === 'number') {
    base = a < b ? -1 : a > b ? 1 : 0;
  } else {
    const as = String(a);
    const bs = String(b);
    base = as < bs ? -1 : as > bs ? 1 : 0;
  }
  return dir === 'asc' ? base : -base;
}
```
- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/queryMatch.test.ts`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add framework/src/gateway/queryMatch.ts framework/test/queryMatch.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "feat(framework): add shared applyQuery evaluator (filter/sort/limit/offset)"
```

---

### Task B3: toQueryString (REST serializer) — creates HttpGateway.ts skeleton

**Files:**
- Create: `framework/src/gateway/HttpGateway.ts`
- Test: `framework/test/toQueryString.test.ts`

**Interfaces:**
- Consumes: `type Query`, `type QueryFilter`, `type QuerySort` from `Query.js`
- Produces: `function toQueryString(q?: Query): string` — leading `?` when non-empty, `''` when empty/undefined; `eq` scalar -> flat `field=value`; non-`eq` -> `filter[field][op]=value`; `in` -> repeated `filter[field][in]=v`; `sort` -> `sort=field` / `sort=-field` (joined comma); flat `limit`/`offset`; `encodeURIComponent` on keys and values exactly as today's `Gateway.index()`

> **Phasing note:** `HttpGateway.ts` is the home of the refactored REST class, which is authored in **Phase D**. In Phase B we create the file with ONLY the `toQueryString` export (the query serializer the class will use). Phase D adds the `HttpGateway` class to this same file and imports `toQueryString` locally — it must NOT recreate or move this function. This preserves today's `Gateway.index()` flat serialization (`?storeId=7`) which the legacy `Gateway.test.ts:47-51` asserts and which migrates into the `HttpGateway` URL assertions in Phase D.

- [ ] **Step 1: Write the failing test**
```ts
import { describe, it, expect } from 'vitest';
import { toQueryString } from '../src/gateway/HttpGateway.js';
import type { Query } from '../src/gateway/Query.js';

describe('toQueryString', () => {
  it('returns "" for undefined', () => {
    expect(toQueryString(undefined)).toBe('');
  });

  it('returns "" for an empty Query', () => {
    expect(toQueryString({})).toBe('');
  });

  it('serializes a single eq scalar as flat field=value (preserves today\'s ?storeId=7)', () => {
    const q: Query = { filters: [{ field: 'storeId', op: 'eq', value: 7 }] };
    expect(toQueryString(q)).toBe('?storeId=7');
  });

  it('serializes multiple eq scalars as ANDed flat params', () => {
    const q: Query = {
      filters: [
        { field: 'storeId', op: 'eq', value: 7 },
        { field: 'active', op: 'eq', value: true },
      ],
    };
    expect(toQueryString(q)).toBe('?storeId=7&active=true');
  });

  it('serializes a non-eq op as filter[field][op]=value', () => {
    const q: Query = { filters: [{ field: 'score', op: 'gte', value: 20 }] };
    expect(toQueryString(q)).toBe('?filter%5Bscore%5D%5Bgte%5D=20');
  });

  it('serializes like as filter[field][like]=value', () => {
    const q: Query = { filters: [{ field: 'name', op: 'like', value: 'al' }] };
    expect(toQueryString(q)).toBe('?filter%5Bname%5D%5Blike%5D=al');
  });

  it('serializes in as repeated filter[field][in] keys', () => {
    const q: Query = { filters: [{ field: 'id', op: 'in', value: [2, 4] }] };
    expect(toQueryString(q)).toBe('?filter%5Bid%5D%5Bin%5D=2&filter%5Bid%5D%5Bin%5D=4');
  });

  it('serializes ascending sort as sort=field', () => {
    const q: Query = { sort: [{ field: 'name', dir: 'asc' }] };
    expect(toQueryString(q)).toBe('?sort=name');
  });

  it('serializes descending sort as sort=-field', () => {
    const q: Query = { sort: [{ field: 'name', dir: 'desc' }] };
    expect(toQueryString(q)).toBe('?sort=-name');
  });

  it('joins a multi-key sort with commas in order', () => {
    const q: Query = {
      sort: [
        { field: 'score', dir: 'desc' },
        { field: 'name', dir: 'asc' },
      ],
    };
    expect(toQueryString(q)).toBe('?sort=-score%2Cname');
  });

  it('serializes flat limit and offset', () => {
    const q: Query = { limit: 10, offset: 20 };
    expect(toQueryString(q)).toBe('?limit=10&offset=20');
  });

  it('combines filters, sort, limit, and offset in order', () => {
    const q: Query = {
      filters: [
        { field: 'storeId', op: 'eq', value: 7 },
        { field: 'score', op: 'gt', value: 5 },
      ],
      sort: [{ field: 'name', dir: 'asc' }],
      limit: 10,
      offset: 0,
    };
    expect(toQueryString(q)).toBe(
      '?storeId=7&filter%5Bscore%5D%5Bgt%5D=5&sort=name&limit=10&offset=0',
    );
  });

  it('encodeURIComponents keys and values', () => {
    const q: Query = { filters: [{ field: 'q', op: 'eq', value: 'a b&c' }] };
    expect(toQueryString(q)).toBe('?q=a%20b%26c');
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/toQueryString.test.ts`
Expected: FAIL with "Failed to resolve import '../src/gateway/HttpGateway.js'" (the file does not exist yet)
- [ ] **Step 3: Create `framework/src/gateway/HttpGateway.ts` (complete code — Phase B authors ONLY `toQueryString`; Phase D adds the class below it)**
```ts
import type { Query, QueryFilter, QuerySort } from './Query.js';

// NOTE: The HttpGateway class is added to this file in Phase D and imports the
// toQueryString helper below. Phase D must NOT recreate or move this function.

const enc = encodeURIComponent;

/**
 * Serialize a Query into a REST query string (with a leading '?', or '' when
 * empty). Mirrors today's flat scalar form so existing endpoints are unchanged
 * (SP1 design §6.1):
 *   - eq scalar           -> field=value          (preserves today's ?storeId=7)
 *   - any other op        -> filter[field][op]=value
 *   - in                  -> repeated filter[field][in]=value keys
 *   - sort                -> sort=field / sort=-field (comma-joined, in order)
 *   - limit / offset      -> flat limit=/offset=
 * Keys and values are encodeURIComponent'd exactly as the legacy Gateway.index().
 */
export function toQueryString(q?: Query): string {
  if (!q) return '';
  const parts: string[] = [];

  if (q.filters) {
    for (const f of q.filters) parts.push(...serializeFilter(f));
  }

  if (q.sort && q.sort.length > 0) {
    parts.push(`sort=${enc(q.sort.map(sortToken).join(','))}`);
  }

  if (q.limit !== undefined) parts.push(`limit=${enc(String(q.limit))}`);
  if (q.offset !== undefined) parts.push(`offset=${enc(String(q.offset))}`);

  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

function serializeFilter(f: QueryFilter): string[] {
  if (f.op === 'eq') {
    // Flat scalar form — preserves today's ?field=value.
    return [`${enc(f.field)}=${enc(String(f.value))}`];
  }
  if (f.op === 'in') {
    const values = Array.isArray(f.value) ? f.value : [];
    return values.map((v) => `${filterKey(f.field, 'in')}=${enc(String(v))}`);
  }
  return [`${filterKey(f.field, f.op)}=${enc(String(f.value))}`];
}

/** filter[field][op] with encoded brackets, e.g. filter%5Bscore%5D%5Bgte%5D. */
function filterKey(field: string, op: string): string {
  return `filter%5B${enc(field)}%5D%5B${op}%5D`;
}

function sortToken(s: QuerySort): string {
  return s.dir === 'desc' ? `-${s.field}` : s.field;
}
```
- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/toQueryString.test.ts`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add framework/src/gateway/HttpGateway.ts framework/test/toQueryString.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "feat(framework): add toQueryString REST serializer (eq flat, non-eq filter[][])"
```


### Task C1: Gateway.ts — interface + Row/Id/RequestCapableGateway/isRequestCapable

**Files:**
- Modify: `framework/src/gateway/Gateway.ts:1-37` (REWRITE the concrete REST class into types + interfaces + type guard; the REST body relocates to `HttpGateway.ts` in Phase D)
- Test: `framework/test/gateway-contract.test.ts`

**Interfaces:**
- Consumes: `Query` (type, from `./Query.js`), `RequestConfig` (type, from `./http.js` — currently declared at `framework/src/gateway/http.ts:5-9`)
- Produces: `Row` (`Record<string, unknown>`), `Id` (`string | number`), `Gateway` interface (`index/show/create/update/destroy`), `RequestCapableGateway` (extends `Gateway` + `request<T>(config: RequestConfig): Promise<T>`), `isRequestCapable(g: Gateway): g is RequestCapableGateway`

> NOTE: The old constructable `export class Gateway` (the REST implementation at `framework/src/gateway/Gateway.ts:4-37`) is removed by this task. Its REST body — `index/show/create/update/destroy/request` against `http.request` — is reborn as `HttpGateway` in Phase D (`framework/src/gateway/HttpGateway.ts`). The old `framework/test/Gateway.test.ts` (which does `new Gateway('/users')`) is migrated/renamed by Phase D, NOT here. This task only introduces the interface surface and the `isRequestCapable` runtime guard, so it does not break `Gateway.test.ts` at runtime until Phase D removes the class consumers — but because this task DELETES the constructable class, `Gateway.test.ts` will fail to import. To keep CI green within this task, this task also temporarily skips `Gateway.test.ts` by renaming it to `framework/test/Gateway.test.ts.skip` (Phase D resurrects it as `HttpGateway.test.ts`). The `import type { Query }` / `import type { RequestConfig }` lines are type-only and erased by esbuild at transpile time, so the new `gateway-contract.test.ts` runs even though `Query.ts` is authored in a different phase.

- [ ] **Step 1: Write the failing test**
```ts
// framework/test/gateway-contract.test.ts
import { describe, it, expect } from 'vitest';
import {
  isRequestCapable,
  type Gateway,
  type RequestCapableGateway,
  type Row,
  type Id,
} from '../src/gateway/Gateway.js';

// A minimal Gateway with NO request() — must be classified non-request-capable.
const plain: Gateway = {
  async index(): Promise<Row[]> {
    return [];
  },
  async show(_id: Id): Promise<Row | null> {
    return null;
  },
  async create(body: Row): Promise<Row> {
    return body;
  },
  async update(_id: Id, body: Row): Promise<Row> {
    return body;
  },
  async destroy(_id: Id): Promise<void> {},
};

// A Gateway that ALSO has request() — must be classified request-capable.
const capable: RequestCapableGateway = {
  ...plain,
  async request<T>(): Promise<T> {
    return undefined as T;
  },
};

describe('Gateway contract', () => {
  it('isRequestCapable returns true when request() is present', () => {
    expect(isRequestCapable(capable)).toBe(true);
  });

  it('isRequestCapable returns false when request() is absent', () => {
    expect(isRequestCapable(plain)).toBe(false);
  });

  it('isRequestCapable returns false when request is not a function', () => {
    const fake = { ...plain, request: 'nope' } as unknown as Gateway;
    expect(isRequestCapable(fake)).toBe(false);
  });

  it('narrows the type so request() is callable after the guard', async () => {
    const g: Gateway = capable;
    if (isRequestCapable(g)) {
      await expect(g.request<number>({ url: '/x' })).resolves.toBeUndefined();
    } else {
      throw new Error('expected request-capable');
    }
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/gateway-contract.test.ts`
Expected: FAIL with "isRequestCapable is not a function" (the named export `isRequestCapable` does not yet exist on `Gateway.ts`, which currently exports only the concrete `class Gateway`).

- [ ] **Step 3: Rewrite `framework/src/gateway/Gateway.ts` into the interface surface (complete code)**

First, get the breaking import out of CI by skipping the old REST test (Phase D resurrects it as `HttpGateway.test.ts`):
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" mv framework/test/Gateway.test.ts framework/test/Gateway.test.ts.skip
```

Then replace the ENTIRE contents of `framework/src/gateway/Gateway.ts` with:
```ts
import type { Query } from './Query.js';
import type { RequestConfig } from './http.js';

/** A plain serializable JSON row, exactly as stored in a model's Redux slice. */
export type Row = Record<string, unknown>;

/** A primary-key value. In-memory/DB generate string UUIDs; HTTP often numeric. */
export type Id = string | number;

/**
 * Storage-strategy contract. Every method returns RAW data (no ApiResponse
 * envelope) and THROWS a typed DataError on real failure. Absence is NOT a
 * failure: show() returns null for a record that legitimately does not exist.
 * All methods are async on every strategy (sync better-sqlite3 is wrapped),
 * so Model never branches on transport.
 */
export interface Gateway {
  index(query?: Query): Promise<Row[]>;
  show(id: Id): Promise<Row | null>;
  create(body: Row): Promise<Row>;
  update(id: Id, body: Row): Promise<Row>;
  destroy(id: Id): Promise<void>;
}

/** REST-only escape hatch for custom endpoints (Model.call). HttpGateway only. */
export interface RequestCapableGateway extends Gateway {
  request<T>(config: RequestConfig): Promise<T>;
}

/** Runtime type guard: true iff the gateway exposes request() (i.e. HttpGateway). */
export function isRequestCapable(g: Gateway): g is RequestCapableGateway {
  return typeof (g as Partial<RequestCapableGateway>).request === 'function';
}
```
- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/gateway-contract.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add framework/src/gateway/Gateway.ts framework/test/gateway-contract.test.ts framework/test/Gateway.test.ts.skip && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "refactor(framework): turn Gateway into a storage-strategy interface + isRequestCapable guard"
```

---

### Task C2: GatewayDeps.ts + genId.ts

**Files:**
- Create: `framework/src/gateway/GatewayDeps.ts`
- Create: `framework/src/gateway/genId.ts`
- Test: `framework/test/genId.test.ts`

**Interfaces:**
- Consumes: `Gateway` (type, from `./Gateway.js` — produced by Task C1), `Store` (type, from `@reduxjs/toolkit`), `ModelSlice` (type, from `../store/createModelSlice.js` — exported at `framework/src/store/createModelSlice.ts:68`, where `ModelSlice['actions']` is the slice action-creator bag)
- Produces: `GatewayDeps` interface (`resource: string; idKey: string; sliceName: string; actions: ModelSlice['actions']; store: Store`), `GatewayClass` type (`new (deps: GatewayDeps) => Gateway`), `genId(): string` (a string UUID using `crypto.randomUUID()` with a timestamp+random fallback)

> NOTE: `GatewayDeps.ts` is types-only (no runtime symbols), so it gets no dedicated test here — it is exercised indirectly by every gateway constructed with it in later phases. `genId.ts` IS runtime and is tested below. `genId()` must (a) always return a `string`, (b) be unique across calls, and (c) prefer `crypto.randomUUID()` when available, falling back when it is absent (the fallback is what keeps core free of any environment assumption).

- [ ] **Step 1: Write the failing test**
```ts
// framework/test/genId.test.ts
import { describe, it, expect, afterEach, vi } from 'vitest';
import { genId } from '../src/gateway/genId.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('genId', () => {
  it('returns a non-empty string', () => {
    const id = genId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('returns a unique value across many calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) ids.add(genId());
    expect(ids.size).toBe(1000);
  });

  it('uses crypto.randomUUID when present', () => {
    const spy = vi.fn(() => '11111111-1111-4111-8111-111111111111');
    vi.stubGlobal('crypto', { randomUUID: spy });
    expect(genId()).toBe('11111111-1111-4111-8111-111111111111');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('falls back to a unique string when crypto.randomUUID is absent', () => {
    vi.stubGlobal('crypto', {}); // no randomUUID
    const a = genId();
    const b = genId();
    expect(typeof a).toBe('string');
    expect(a.length).toBeGreaterThan(0);
    expect(a).not.toBe(b);
  });

  it('falls back when crypto itself is undefined', () => {
    vi.stubGlobal('crypto', undefined);
    const id = genId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/genId.test.ts`
Expected: FAIL with "Failed to resolve import \"../src/gateway/genId.js\"" (the module does not exist yet).

- [ ] **Step 3: Create `framework/src/gateway/GatewayDeps.ts` and `framework/src/gateway/genId.ts` (complete code)**

Create `framework/src/gateway/GatewayDeps.ts`:
```ts
import type { Store } from '@reduxjs/toolkit';
import type { Gateway } from './Gateway.js';
import type { ModelSlice } from '../store/createModelSlice.js';

/**
 * The dependency bundle the framework hands every gateway at construction.
 * Passing `store` lets InMemoryGateway read its slice with NO global-singleton
 * import and NO registry round-trip, and keeps construction uniform across all
 * three strategies.
 */
export interface GatewayDeps {
  resource: string; // table/collection name; URL path for HttpGateway only
  idKey: string; // primary-key field (default 'id')
  sliceName: string;
  actions: ModelSlice['actions'];
  store: Store; // InMemoryGateway reads via this; never imports the singleton
}

/** The Factory signature registerModel uses to instantiate a gateway strategy. */
export type GatewayClass = new (deps: GatewayDeps) => Gateway;
```

Create `framework/src/gateway/genId.ts`:
```ts
/**
 * One shared id generator. Returns a string UUID via crypto.randomUUID() when
 * available, with a timestamp + random fallback for environments that lack it.
 * Used by InMemoryGateway and DbGateway create() when body[idKey] is unset; a
 * developer-supplied id is always honored upstream.
 */
export function genId(): string {
  const c: { randomUUID?: () => string } | undefined =
    typeof crypto !== 'undefined' ? (crypto as { randomUUID?: () => string }) : undefined;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
```
- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/genId.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add framework/src/gateway/GatewayDeps.ts framework/src/gateway/genId.ts framework/test/genId.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "feat(framework): add GatewayDeps bundle + GatewayClass factory type + genId"
```


### Task D1: HTTP transport — raw-`T` return + typed-error classification

**Files:**
- Modify: `framework/src/gateway/http.ts:1-56` (full rewrite of the request body; current: imports 1-3, `RequestConfig` 5-9, `async function request<T>` 11-53 with throw sites at lines 31/38/46 and `return parsed` at 52, `export const http` at 55)
- Test: `framework/test/http.test.ts` (migrate existing — current `res.data` assertion at line 30, `name: 'ApiError'` at line 36, network case at lines 45-48)

**Interfaces:**
- Consumes: `getHttpConfig(): { baseURL: string; tokenProvider: () => Promise<string|null> }` (from `config/Config.js`); `HttpError` (from `gateway/HttpError.js`, constructed `new HttpError(message, { status, url, errors })`); `NetworkError` (from `errors/NetworkError.js`, `new NetworkError(message, { url, cause })`); `AuthError` (from `errors/AuthError.js`, `new AuthError(message, { status, cause })`); `ValidationError` (from `errors/ValidationError.js`, `new ValidationError(message, { fields, cause })`); `ApiResponse<T>` (from `entities/ApiResponse.js`); `DataError` (from `errors/DataError.js`, base of all the above)
- Produces: `RequestConfig` (unchanged: `{ url: string; method?: 'GET'|'POST'|'PUT'|'PATCH'|'DELETE'; body?: unknown }`); `http.request<T>(config: RequestConfig): Promise<T>` (now returns RAW `T` = `parsed.data`, throws typed `DataError` subtypes)

- [ ] **Step 1: Write the failing test** — replace the entire contents of `framework/test/http.test.ts` with:
```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { http } from '../src/gateway/http.js';
import { HttpError } from '../src/gateway/HttpError.js';
import { NetworkError } from '../src/errors/NetworkError.js';
import { AuthError } from '../src/errors/AuthError.js';
import { ValidationError } from '../src/errors/ValidationError.js';
import { DataError } from '../src/errors/DataError.js';
import { configureSublime, resetConfig } from '../src/config/Config.js';
import { mockFetch } from '../src/test-utils/mockFetch.js';

function configure(token: string | null = 'tok') {
  configureSublime({
    baseURL: 'https://api.example.com',
    tokenProvider: async () => token,
    storageAdapter: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} },
    platform: 'web',
  });
}

describe('http.request', () => {
  beforeEach(() => { resetConfig(); configure(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('prepends baseURL, attaches Bearer token, returns raw data (unwrapped)', async () => {
    let seen: { url: string; method: string; auth?: string | undefined } | null = null;
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      seen = { url, method: init?.method ?? 'GET', auth: headers.get('Authorization') ?? undefined };
      return { ok: true, status: 200, json: async () => ({ success: true, message: 'ok', data: { id: 1 }, errors: null }) } as Response;
    });
    const res = await http.request<{ id: number }>({ url: '/users/1' });
    expect(seen!.url).toBe('https://api.example.com/users/1');
    expect(seen!.auth).toBe('Bearer tok');
    expect(res).toEqual({ id: 1 });
  });

  it('throws HttpError (name HttpError, instanceof DataError) on non-2xx with status', async () => {
    mockFetch(() => ({ status: 404, json: { success: false, message: 'Not found', data: null, errors: { id: ['missing'] } } }));
    const err = await http.request({ url: '/users/9' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err).toBeInstanceOf(DataError);
    expect((err as HttpError).name).toBe('HttpError');
    expect((err as HttpError).status).toBe(404);
    expect((err as HttpError).url).toBe('https://api.example.com/users/9');
    expect((err as HttpError).code).toBe('http');
  });

  it('throws HttpError when success is false even on 200', async () => {
    mockFetch(() => ({ status: 200, json: { success: false, message: 'Invalid', data: null, errors: {} } }));
    await expect(http.request({ url: '/users' })).rejects.toBeInstanceOf(HttpError);
  });

  it('throws AuthError on 401', async () => {
    mockFetch(() => ({ status: 401, json: { success: false, message: 'Unauthorized', data: null, errors: null } }));
    const err = await http.request({ url: '/users' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AuthError);
    expect(err).toBeInstanceOf(DataError);
    expect((err as AuthError).code).toBe('auth');
    expect((err as AuthError).status).toBe(401);
  });

  it('throws AuthError on 403', async () => {
    mockFetch(() => ({ status: 403, json: { success: false, message: 'Forbidden', data: null, errors: null } }));
    await expect(http.request({ url: '/users' })).rejects.toBeInstanceOf(AuthError);
  });

  it('throws ValidationError on 422', async () => {
    mockFetch(() => ({ status: 422, json: { success: false, message: 'Unprocessable', data: null, errors: { name: ['required'] } } }));
    const err = await http.request({ url: '/users' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toBeInstanceOf(DataError);
    expect((err as ValidationError).code).toBe('validation');
    expect((err as ValidationError).fields).toEqual({ name: ['required'] });
  });

  it('throws NetworkError on a fetch (connection) failure', async () => {
    vi.stubGlobal('fetch', async () => { throw new TypeError('network down'); });
    const err = await http.request({ url: '/users' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NetworkError);
    expect(err).toBeInstanceOf(DataError);
    expect((err as NetworkError).code).toBe('network');
    expect((err as NetworkError).url).toBe('https://api.example.com/users');
  });

  it('throws HttpError on invalid JSON body', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('bad json'); } }) as Response);
    const err = await http.request({ url: '/users' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(200);
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/http.test.ts`
Expected: FAIL — module resolution / classification errors, e.g. `Failed to resolve import "../src/gateway/HttpError.js"` is satisfied by the error phase, but `http` still returns the `ApiResponse` envelope so `expect(res).toEqual({ id: 1 })` fails with "expected { success: true, ... } to deeply equal { id: 1 }", and the 401/422/network assertions fail with "expected ApiError to be an instance of AuthError/ValidationError/NetworkError".
- [ ] **Step 3: Rewrite `framework/src/gateway/http.ts` (complete code)** — replace the entire file:
```ts
import { getHttpConfig } from '../config/Config.js';
import { HttpError } from './HttpError.js';
import { NetworkError } from '../errors/NetworkError.js';
import { AuthError } from '../errors/AuthError.js';
import { ValidationError } from '../errors/ValidationError.js';
import type { ApiResponse } from '../entities/ApiResponse.js';

export interface RequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/**
 * Performs an HTTP request, unwraps the (HTTP-internal) ApiResponse envelope and
 * returns the RAW `T` (`parsed.data`). Real failures throw a typed DataError:
 *   fetch threw          -> NetworkError
 *   invalid JSON body    -> HttpError
 *   401 / 403            -> AuthError
 *   422                  -> ValidationError
 *   any other non-2xx    -> HttpError   (404 included; HttpGateway maps it to null)
 *   success === false    -> HttpError
 */
async function request<T>(config: RequestConfig): Promise<T> {
  const { baseURL, tokenProvider } = getHttpConfig();
  const fullUrl = `${baseURL}${config.url}`;
  const token = await tokenProvider();

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token !== null) headers['Authorization'] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      method: config.method ?? 'GET',
      headers,
      ...(config.body === undefined ? {} : { body: JSON.stringify(config.body) }),
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Network request failed';
    throw new NetworkError(message, { url: fullUrl, cause });
  }

  let parsed: ApiResponse<T>;
  try {
    parsed = (await response.json()) as ApiResponse<T>;
  } catch (cause) {
    throw new HttpError('Invalid JSON response', {
      status: response.status,
      errors: cause,
      url: fullUrl,
    });
  }

  if (!response.ok || parsed.success === false) {
    const message = parsed.message || `Request failed (${response.status})`;
    if (response.status === 401 || response.status === 403) {
      throw new AuthError(message, { status: response.status, cause: parsed.errors });
    }
    if (response.status === 422) {
      throw new ValidationError(message, { fields: parsed.errors, cause: parsed.errors });
    }
    throw new HttpError(message, {
      status: response.status,
      errors: parsed.errors,
      url: fullUrl,
    });
  }
  return parsed.data;
}

export const http = { request };
```
- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/http.test.ts`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add framework/src/gateway/http.ts framework/test/http.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "refactor(framework): http.request returns raw data and throws typed DataErrors"
```

---

### Task D2: HttpGateway class (RequestCapableGateway over REST)

**Files:**
- Create: `framework/src/gateway/HttpGateway.ts`
- Modify (rename + rewrite): `framework/test/Gateway.test.ts` -> `framework/test/HttpGateway.test.ts` (current: `new Gateway('/users')` at line 32, `?storeId=7` assertion at line 50, envelope `data: []` stub at line 13)
- Test: `framework/test/HttpGateway.test.ts`

**Interfaces:**
- Consumes: `Gateway`, `RequestCapableGateway`, `Row`, `Id` (from `gateway/Gateway.js` — the rewritten interface module); `GatewayDeps` (from `gateway/GatewayDeps.js`, `{ resource, idKey, sliceName, actions, store }`); `RequestConfig`, `http` (from `gateway/http.js`, `http.request<T>(config): Promise<T>`); `HttpError` (from `gateway/HttpError.js`, has `.status`); `toQueryString(q?: Query): string` (from `gateway/HttpGateway.js` itself — co-located helper, see Step 3); `Query`, `QueryFilter`, `FilterValue` (from `gateway/Query.js`); `registerModel(M, HttpGateway)` overload (from `register.js`, for the registration-driven assertion); `Model` (from `model/Model.js`, for the registration test fixture)
- Produces: `HttpGateway` (class implementing `RequestCapableGateway`, constructed `new HttpGateway(deps: GatewayDeps)`); `toQueryString(q?: Query): string` (exported helper — `eq` scalar -> flat `?field=value`; non-`eq` -> `filter[field][op]=value`; `in` -> repeated keys; `sort=field`/`sort=-field`; flat `limit`/`offset`)

- [ ] **Step 1: Write the failing test** — create `framework/test/HttpGateway.test.ts` (this replaces the renamed `framework/test/Gateway.test.ts`):
```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HttpGateway } from '../src/gateway/HttpGateway.js';
import { toQueryString } from '../src/gateway/HttpGateway.js';
import type { GatewayDeps } from '../src/gateway/GatewayDeps.js';
import { configureSublime, resetConfig } from '../src/config/Config.js';

function deps(resource: string): GatewayDeps {
  return {
    resource,
    idKey: 'id',
    sliceName: 'rows',
    // actions + store are unused by HttpGateway's CRUD path (it talks to fetch);
    // cast minimal stubs to satisfy the bundle type.
    actions: {} as GatewayDeps['actions'],
    store: { getState: () => ({}), dispatch: () => undefined } as unknown as GatewayDeps['store'],
  };
}

function calls() {
  const seen: { url: string; method: string; body: unknown }[] = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    seen.push({
      url,
      method: init?.method ?? 'GET',
      body: init?.body ? JSON.parse(init.body as string) : undefined,
    });
    return { ok: true, status: 200, json: async () => ({ success: true, message: '', data: [], errors: null }) } as Response;
  });
  return seen;
}

describe('HttpGateway', () => {
  beforeEach(() => {
    resetConfig();
    configureSublime({
      baseURL: 'https://api.example.com',
      tokenProvider: async () => null,
      storageAdapter: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} },
      platform: 'web',
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('maps CRUD methods to the right URL + verb', async () => {
    const seen = calls();
    const g = new HttpGateway(deps('/users'));
    await g.index();
    await g.show(1);
    await g.create({ name: 'a' });
    await g.update(1, { name: 'b' });
    await g.destroy(1);
    expect(seen).toEqual([
      { url: 'https://api.example.com/users', method: 'GET', body: undefined },
      { url: 'https://api.example.com/users/1', method: 'GET', body: undefined },
      { url: 'https://api.example.com/users', method: 'POST', body: { name: 'a' } },
      { url: 'https://api.example.com/users/1', method: 'PUT', body: { name: 'b' } },
      { url: 'https://api.example.com/users/1', method: 'DELETE', body: undefined },
    ]);
  });

  it('serialises a flat eq filter to ?storeId=7 (preserves today\'s shape)', async () => {
    const seen = calls();
    await new HttpGateway(deps('/sales')).index({ filters: [{ field: 'storeId', op: 'eq', value: 7 }] });
    expect(seen[0]!.url).toBe('https://api.example.com/sales?storeId=7');
  });

  it('show() returns the raw row (unwrapped, not res.data envelope)', async () => {
    vi.stubGlobal('fetch', async () =>
      ({ ok: true, status: 200, json: async () => ({ success: true, message: '', data: { id: 1, name: 'a' }, errors: null }) }) as Response);
    const row = await new HttpGateway(deps('/users')).show(1);
    expect(row).toEqual({ id: 1, name: 'a' });
  });

  it('show() maps a 404 to null (absence is not a failure)', async () => {
    vi.stubGlobal('fetch', async () =>
      ({ ok: false, status: 404, json: async () => ({ success: false, message: 'gone', data: null, errors: null }) }) as Response);
    const row = await new HttpGateway(deps('/users')).show(99);
    expect(row).toBeNull();
  });

  it('show() rethrows non-404 errors', async () => {
    vi.stubGlobal('fetch', async () =>
      ({ ok: false, status: 500, json: async () => ({ success: false, message: 'boom', data: null, errors: null }) }) as Response);
    await expect(new HttpGateway(deps('/users')).show(1)).rejects.toMatchObject({ status: 500 });
  });

  it('request<T>() is a passthrough to http.request', async () => {
    const seen = calls();
    await new HttpGateway(deps('/users')).request<unknown[]>({ url: '/users/expired' });
    expect(seen[0]).toEqual({ url: 'https://api.example.com/users/expired', method: 'GET', body: undefined });
  });

  it('toQueryString: empty / undefined -> empty string', () => {
    expect(toQueryString()).toBe('');
    expect(toQueryString({})).toBe('');
  });

  it('toQueryString: non-eq filter, in, sort, limit, offset', () => {
    expect(toQueryString({ filters: [{ field: 'age', op: 'gte', value: 18 }] }))
      .toBe('?filter[age][gte]=18');
    expect(toQueryString({ filters: [{ field: 'id', op: 'in', value: [1, 2] }] }))
      .toBe('?filter[id][in]=1&filter[id][in]=2');
    expect(toQueryString({ sort: [{ field: 'name', dir: 'asc' }, { field: 'age', dir: 'desc' }] }))
      .toBe('?sort=name&sort=-age');
    expect(toQueryString({ limit: 10, offset: 20 })).toBe('?limit=10&offset=20');
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/HttpGateway.test.ts`
Expected: FAIL with `Failed to resolve import "../src/gateway/HttpGateway.js"` (the module does not exist yet).
- [ ] **Step 3: Create `framework/src/gateway/HttpGateway.ts` (complete code)**:
```ts
import { http, type RequestConfig } from './http.js';
import { HttpError } from './HttpError.js';
import type { Gateway, RequestCapableGateway, Row, Id } from './Gateway.js';
import type { GatewayDeps } from './GatewayDeps.js';
import type { Query, QueryFilter, FilterValue } from './Query.js';

/**
 * Serialises a neutral Query to a REST query string.
 *   eq scalar  -> flat `?field=value`        (preserves today's `?storeId=7`)
 *   other ops  -> `filter[field][op]=value`
 *   in         -> repeated `filter[field][in]=v` keys
 *   sort       -> `sort=field` / `sort=-field` (desc), repeated, in order
 *   limit/offset -> flat keys
 */
export function toQueryString(q?: Query): string {
  if (!q) return '';
  const parts: string[] = [];

  const enc = (v: string | number | boolean): string => encodeURIComponent(String(v));

  for (const f of q.filters ?? []) {
    appendFilter(parts, f);
  }
  for (const s of q.sort ?? []) {
    parts.push(`sort=${s.dir === 'desc' ? '-' : ''}${enc(s.field)}`);
  }
  if (q.limit !== undefined) parts.push(`limit=${enc(q.limit)}`);
  if (q.offset !== undefined) parts.push(`offset=${enc(q.offset)}`);

  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

function appendFilter(parts: string[], f: QueryFilter): void {
  const key = encodeURIComponent(f.field);
  const scalar = (v: FilterValue): string =>
    encodeURIComponent(String(v));
  if (f.op === 'eq') {
    // flat shape — preserves today's `?storeId=7`
    parts.push(`${key}=${scalar(f.value)}`);
    return;
  }
  if (f.op === 'in' && Array.isArray(f.value)) {
    for (const v of f.value) parts.push(`filter[${key}][in]=${encodeURIComponent(String(v))}`);
    return;
  }
  parts.push(`filter[${key}][${f.op}]=${scalar(f.value)}`);
}

/**
 * REST strategy. Returns RAW rows (http.request unwraps the envelope) and throws
 * typed DataErrors. show() maps a 404 to null (absence is not a failure). The
 * only request-capable gateway: Model.call() routes here.
 */
export class HttpGateway implements RequestCapableGateway {
  constructor(private readonly deps: GatewayDeps) {}

  private get resource(): string {
    return this.deps.resource;
  }

  index(query?: Query): Promise<Row[]> {
    return http.request<Row[]>({ url: `${this.resource}${toQueryString(query)}` });
  }

  async show(id: Id): Promise<Row | null> {
    try {
      return await http.request<Row>({ url: `${this.resource}/${id}` });
    } catch (e) {
      if (e instanceof HttpError && e.status === 404) return null;
      throw e;
    }
  }

  create(body: Row): Promise<Row> {
    return http.request<Row>({ url: this.resource, method: 'POST', body });
  }

  update(id: Id, body: Row): Promise<Row> {
    return http.request<Row>({ url: `${this.resource}/${id}`, method: 'PUT', body });
  }

  async destroy(id: Id): Promise<void> {
    await http.request<unknown>({ url: `${this.resource}/${id}`, method: 'DELETE' });
  }

  request<T>(config: RequestConfig): Promise<T> {
    return http.request<T>(config);
  }
}

// Compile-time guard: HttpGateway satisfies the Gateway interface.
const _typecheck: new (deps: GatewayDeps) => Gateway = HttpGateway;
void _typecheck;
```
- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/HttpGateway.test.ts`
Expected: PASS
- [ ] **Step 5: Commit** (the rename is recorded by removing the old test and adding the new one in the same commit):
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" rm framework/test/Gateway.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add framework/src/gateway/HttpGateway.ts framework/test/HttpGateway.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "feat(framework): add HttpGateway (RequestCapableGateway) with toQueryString and 404->null"
```


### Task E1: InMemoryGateway (default strategy)

**Files:**
- Create: `framework/src/gateway/InMemoryGateway.ts`
- Test: `framework/test/InMemoryGateway.test.ts`

**Interfaces:**
- Consumes:
  - `Gateway` (interface `index(query?: Query): Promise<Row[]>; show(id: Id): Promise<Row | null>; create(body: Row): Promise<Row>; update(id: Id, body: Row): Promise<Row>; destroy(id: Id): Promise<void>`) from `framework/src/gateway/Gateway.ts`
  - `Row = Record<string, unknown>`, `Id = string | number` from `framework/src/gateway/Gateway.ts`
  - `GatewayDeps` (`{ resource: string; idKey: string; sliceName: string; actions: ModelSlice['actions']; store: Store }`) from `framework/src/gateway/GatewayDeps.ts`
  - `Query` (`{ filters?; sort?; limit?; offset? }`) from `framework/src/gateway/Query.ts`
  - `applyQuery(rows: Row[], q: Query): Row[]` from `framework/src/gateway/queryMatch.ts`
  - `genId(): string` from `framework/src/gateway/genId.ts`
  - `NotFoundError` (constructed `new NotFoundError(message, { resource, id })`) from `framework/src/errors/NotFoundError.js` (re-exported via `framework/src/errors/index.js`)
- Produces:
  - `InMemoryGateway` (`class InMemoryGateway implements Gateway`, constructor `(deps: GatewayDeps)`) from `framework/src/gateway/InMemoryGateway.ts` — consumed by `registerModel` (the default `GatewayClass`) and by the barrel `index.ts`.

- [ ] **Step 1: Write the failing test**
```ts
// framework/test/InMemoryGateway.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { InMemoryGateway } from '../src/gateway/InMemoryGateway.js';
import { createModelSlice } from '../src/store/createModelSlice.js';
import { NotFoundError } from '../src/errors/index.js';
import type { GatewayDeps } from '../src/gateway/GatewayDeps.js';
import type { Row } from '../src/gateway/Gateway.js';

// Builds a real, isolated Redux store holding one model slice named `notes`,
// then a GatewayDeps bundle pointing the gateway at that slice. The gateway must
// read state via deps.store.getState()[deps.sliceName].items — never a singleton.
function harness(seed: Row[] = []) {
  const slice = createModelSlice('notes', { idKey: 'id' });
  const store = configureStore({ reducer: { notes: slice.reducer } });
  if (seed.length) store.dispatch(slice.actions.setItems(seed));
  const deps: GatewayDeps = {
    resource: 'notes',
    idKey: 'id',
    sliceName: 'notes',
    actions: slice.actions,
    store,
  };
  const gateway = new InMemoryGateway(deps);
  const items = () => (store.getState().notes as { items: Row[] }).items;
  return { slice, store, deps, gateway, items };
}

describe('InMemoryGateway', () => {
  let h: ReturnType<typeof harness>;
  beforeEach(() => {
    h = harness([
      { id: '1', title: 'alpha', pinned: true },
      { id: '2', title: 'beta', pinned: false },
      { id: '3', title: 'gamma', pinned: true },
    ]);
  });

  it('index() with no query returns a defensive copy of every slice item', async () => {
    const rows = await h.gateway.index();
    expect(rows).toEqual([
      { id: '1', title: 'alpha', pinned: true },
      { id: '2', title: 'beta', pinned: false },
      { id: '3', title: 'gamma', pinned: true },
    ]);
    expect(rows).not.toBe(h.items());
  });

  it('index() with an empty slice returns []', async () => {
    const empty = harness();
    expect(await empty.gateway.index()).toEqual([]);
  });

  it('index(query) delegates filtering to applyQuery', async () => {
    const rows = await h.gateway.index({ filters: [{ field: 'pinned', op: 'eq', value: true }] });
    expect(rows.map((r) => r.id)).toEqual(['1', '3']);
  });

  it('show() returns the matching row by idKey', async () => {
    expect(await h.gateway.show('2')).toEqual({ id: '2', title: 'beta', pinned: false });
  });

  it('show() returns null for a genuinely absent id (not an error)', async () => {
    expect(await h.gateway.show('999')).toBeNull();
  });

  it('create() assigns a generated string id when body has none, and returns the row', async () => {
    const created = await h.gateway.create({ title: 'delta', pinned: false });
    expect(typeof created.id).toBe('string');
    expect((created.id as string).length).toBeGreaterThan(0);
    expect(created).toMatchObject({ title: 'delta', pinned: false });
  });

  it('create() honors a developer-supplied id', async () => {
    const created = await h.gateway.create({ id: 'custom', title: 'epsilon' });
    expect(created.id).toBe('custom');
  });

  it('create() does NOT write the slice itself (Model is the single writer)', async () => {
    const before = h.items().length;
    await h.gateway.create({ title: 'zeta' });
    expect(h.items().length).toBe(before);
  });

  it('update() returns the merged row, keeping the id', async () => {
    const updated = await h.gateway.update('2', { title: 'beta!' });
    expect(updated).toEqual({ id: '2', title: 'beta!', pinned: false });
  });

  it('update() throws NotFoundError for a missing id', async () => {
    await expect(h.gateway.update('999', { title: 'x' })).rejects.toBeInstanceOf(NotFoundError);
    await expect(h.gateway.update('999', { title: 'x' })).rejects.toMatchObject({
      resource: 'notes',
      id: '999',
    });
  });

  it('destroy() resolves to a no-op (Model dispatches removeItem)', async () => {
    const before = h.items().length;
    await expect(h.gateway.destroy('1')).resolves.toBeUndefined();
    expect(h.items().length).toBe(before);
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/InMemoryGateway.test.ts`
Expected: FAIL with "Failed to resolve import \"../src/gateway/InMemoryGateway.js\"" (the module does not exist yet).
- [ ] **Step 3: Create `framework/src/gateway/InMemoryGateway.ts` (complete code)**
```ts
// framework/src/gateway/InMemoryGateway.ts
import type { Gateway, Row, Id } from './Gateway.js';
import type { GatewayDeps } from './GatewayDeps.js';
import type { Query } from './Query.js';
import { applyQuery } from './queryMatch.js';
import { genId } from './genId.js';
import { NotFoundError } from '../errors/index.js';

/**
 * Default storage strategy. The model's Redux slice is the source of truth.
 *
 * Reads come straight from the injected store
 * (`deps.store.getState()[deps.sliceName].items`) — NEVER from the global store
 * singleton, so the gateway is testable with any configureStore() and honors
 * the single-writer rule (§5.2): writes only COMPUTE and return rows; `Model`
 * dispatches `setItems`/`upsertItem`/`removeItem` to commit them.
 */
export class InMemoryGateway implements Gateway {
  constructor(private readonly deps: GatewayDeps) {}

  private items(): Row[] {
    const state = this.deps.store.getState() as Record<
      string,
      { items: Row[] } | undefined
    >;
    return state[this.deps.sliceName]?.items ?? [];
  }

  async index(query?: Query): Promise<Row[]> {
    const rows = this.items();
    return query ? applyQuery(rows, query) : rows.map((r) => ({ ...r }));
  }

  async show(id: Id): Promise<Row | null> {
    const key = this.deps.idKey;
    return this.items().find((r) => r[key] === id) ?? null;
  }

  async create(body: Row): Promise<Row> {
    const key = this.deps.idKey;
    return { ...body, [key]: body[key] ?? genId() };
  }

  async update(id: Id, body: Row): Promise<Row> {
    const key = this.deps.idKey;
    const current = this.items().find((r) => r[key] === id);
    if (!current) {
      throw new NotFoundError(`${this.deps.resource}#${id} not found`, {
        resource: this.deps.resource,
        id,
      });
    }
    return { ...current, ...body, [key]: id };
  }

  async destroy(_id: Id): Promise<void> {
    // No-op: Model.delete dispatches removeItem (Model.ts:110). The slice is the
    // source of truth, so there is nothing for the gateway to persist.
  }
}
```
- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/InMemoryGateway.test.ts`
Expected: PASS (all assertions green).
- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add framework/src/gateway/InMemoryGateway.ts framework/test/InMemoryGateway.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "feat(framework): add InMemoryGateway default storage strategy"
```


### Task F1: Config — optional HTTP/DB deps, lazy validators

**Files:**
- Modify: `framework/src/config/Config.ts:7-12` (`SublimeConfig` fields) and `:20-27` (add `getHttpConfig`/`getDatabaseAdapter`)
- Test: `framework/test/Config.test.ts`

**Interfaces:**
- Consumes: `ConfigError` (from `../errors/ConfigError.js`); `DatabaseAdapter` (from `../gateway/DatabaseAdapter.js`)
- Produces: `SublimeConfig` (now `baseURL?`, `tokenProvider?`, `databaseAdapter?`, `storageAdapter?`, `platform` required); `getHttpConfig(): { baseURL: string; tokenProvider: () => Promise<string|null> }` (throws `ConfigError` if `baseURL` missing); `getDatabaseAdapter(): DatabaseAdapter` (throws `ConfigError` if unset); existing `configureSublime`, `getConfig`, `resetConfig`, `StorageAdapter` unchanged

- [ ] **Step 1: Write the failing test**
```ts
// framework/test/Config.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  configureSublime,
  getConfig,
  getHttpConfig,
  getDatabaseAdapter,
  resetConfig,
  type SublimeConfig,
} from '../src/config/Config.js';
import { ConfigError } from '../src/errors/ConfigError.js';
import type { DatabaseAdapter } from '../src/gateway/DatabaseAdapter.js';

const fake: SublimeConfig = {
  baseURL: 'https://api.example.com',
  tokenProvider: async () => 'tok',
  storageAdapter: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  },
  platform: 'web',
};

const fakeDbAdapter: DatabaseAdapter = {
  ensureCollection: async () => {},
  get: async () => null,
  getAll: async () => [],
  query: async () => [],
  insert: async (_r, row) => row,
  update: async (_r, _id, row) => row,
  delete: async () => {},
};

describe('Config', () => {
  beforeEach(() => resetConfig());

  it('throws if read before configured', () => {
    expect(() => getConfig()).toThrow(/configureSublime/);
  });

  it('returns the configured values (4-field config still valid)', () => {
    configureSublime(fake);
    expect(getConfig().baseURL).toBe('https://api.example.com');
    expect(getConfig().platform).toBe('web');
  });

  it('accepts a platform-only config (zero-config in-memory default)', () => {
    expect(() => configureSublime({ platform: 'web' })).not.toThrow();
    expect(getConfig().platform).toBe('web');
  });

  it('getHttpConfig returns baseURL + tokenProvider when present', async () => {
    configureSublime(fake);
    const http = getHttpConfig();
    expect(http.baseURL).toBe('https://api.example.com');
    expect(await http.tokenProvider()).toBe('tok');
  });

  it('getHttpConfig defaults tokenProvider to "no token" when omitted', async () => {
    configureSublime({ platform: 'web', baseURL: 'https://x.test' });
    expect(await getHttpConfig().tokenProvider()).toBeNull();
  });

  it('getHttpConfig throws ConfigError when baseURL is absent', () => {
    configureSublime({ platform: 'web' });
    expect(() => getHttpConfig()).toThrow(ConfigError);
    expect(() => getHttpConfig()).toThrow(/baseURL/);
  });

  it('getDatabaseAdapter returns the configured adapter', () => {
    configureSublime({ platform: 'web', databaseAdapter: fakeDbAdapter });
    expect(getDatabaseAdapter()).toBe(fakeDbAdapter);
  });

  it('getDatabaseAdapter throws ConfigError when adapter is absent', () => {
    configureSublime({ platform: 'web' });
    expect(() => getDatabaseAdapter()).toThrow(ConfigError);
    expect(() => getDatabaseAdapter()).toThrow(/databaseAdapter/);
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/Config.test.ts`
Expected: FAIL — `getHttpConfig`/`getDatabaseAdapter` are not exported (`SyntaxError: ... does not provide an export named 'getHttpConfig'`), and `configureSublime({ platform: 'web' })` is a type error.
- [ ] **Step 3: Rewrite Config.ts (complete code)**
```ts
// framework/src/config/Config.ts
import { ConfigError } from '../errors/ConfigError.js';
import type { DatabaseAdapter } from '../gateway/DatabaseAdapter.js';

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface SublimeConfig {
  /** Required only if a model uses HttpGateway. */
  baseURL?: string;
  /** Defaults to "no token" when omitted. */
  tokenProvider?: () => Promise<string | null>;
  /** Required only if a model uses DbGateway (document store). */
  databaseAdapter?: DatabaseAdapter;
  /** KV string store (separate port from databaseAdapter); now optional. */
  storageAdapter?: StorageAdapter;
  /** Always required — drives platform auto-selection. */
  platform: 'mobile' | 'web' | 'desktop';
}

let current: SublimeConfig | null = null;

export function configureSublime(config: SublimeConfig): void {
  current = config;
}

export function getConfig(): SublimeConfig {
  if (current === null) {
    throw new Error(
      'Sublime is not configured. Call configureSublime({ platform, baseURL?, tokenProvider?, databaseAdapter?, storageAdapter? }) at app startup.',
    );
  }
  return current;
}

/**
 * HTTP config for HttpGateway. Validated lazily so a local-only/in-memory app
 * is not forced to supply a baseURL. Throws ConfigError if baseURL is missing.
 */
export function getHttpConfig(): {
  baseURL: string;
  tokenProvider: () => Promise<string | null>;
} {
  const cfg = getConfig();
  if (cfg.baseURL === undefined || cfg.baseURL === '') {
    throw new ConfigError(
      'HttpGateway requires a baseURL. Call configureSublime({ baseURL: "https://api.example.com", platform }).',
    );
  }
  return {
    baseURL: cfg.baseURL,
    tokenProvider: cfg.tokenProvider ?? (async () => null),
  };
}

/**
 * Document-store adapter for DbGateway. Validated lazily. Throws ConfigError if
 * no databaseAdapter was configured.
 */
export function getDatabaseAdapter(): DatabaseAdapter {
  const cfg = getConfig();
  if (cfg.databaseAdapter === undefined) {
    throw new ConfigError(
      'DbGateway requires a databaseAdapter. Call configureSublime({ databaseAdapter: createDatabaseAdapter(), platform }).',
    );
  }
  return cfg.databaseAdapter;
}

/** Test-only: clears the configured singleton. */
export function resetConfig(): void {
  current = null;
}
```
- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/Config.test.ts`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add framework/src/config/Config.ts framework/test/Config.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "feat(framework): make HTTP/DB config optional with lazy getHttpConfig/getDatabaseAdapter validators"
```

---

### Task F2: registerModel — overloads, GatewayDeps factory, in-memory default

**Files:**
- Modify: `framework/src/register.ts:1-31` (full rewrite of imports + body)
- Modify: `framework/src/discovery/modelRegistry.ts:1` (gateway typed to the `Gateway` interface — broadens, value import already type-only)
- Test: `framework/test/register.test.ts`, `framework/test/modelRegistry.test.ts`

**Interfaces:**
- Consumes: `Gateway`, `GatewayClass` (from `./gateway/Gateway.js` / `./gateway/GatewayDeps.js`); `GatewayDeps` (from `./gateway/GatewayDeps.js`); `InMemoryGateway`, `DbGateway` (from `./gateway/InMemoryGateway.js` / `./gateway/DbGateway.js`); `getConfig` (from `./config/Config.js`); `createModelSlice`, `registerReducer`, `modelRegistry` (unchanged); `store` (from `./store/store.js`)
- Produces: `registerModel(M, gateway: GatewayClass, opts?): void` and `registerModel(M, opts?): void` overloads; `ModelRegistration.gateway: Gateway`

- [ ] **Step 1: Write the failing tests (both files)**
```ts
// framework/test/register.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerModel } from '../src/register.js';
import { modelRegistry } from '../src/discovery/modelRegistry.js';
import { store } from '../src/store/store.js';
import { InMemoryGateway } from '../src/gateway/InMemoryGateway.js';
import { HttpGateway } from '../src/gateway/HttpGateway.js';
import { DbGateway } from '../src/gateway/DbGateway.js';
import { configureSublime, resetConfig } from '../src/config/Config.js';
import type { DatabaseAdapter } from '../src/gateway/DatabaseAdapter.js';

class Invoice {
  static resource = '/invoices';
}
class Receipt {
  static resource = '/receipts';
}

describe('registerModel', () => {
  it('wires gateway + slice + reducer + discovery', () => {
    registerModel(Invoice as unknown as { name: string; resource?: string });
    const reg = modelRegistry.resolve(Invoice);
    expect(reg.sliceName).toBe('invoices');
    expect(reg.idKey).toBe('id');
    // reducer is registered → store has the slice after a dispatch
    store.dispatch(reg.actions.setItems([{ id: 1 }]));
    const state = store.getState() as Record<string, { items: unknown[] }>;
    expect(state['invoices']!.items).toEqual([{ id: 1 }]);
  });

  it('defaults to an InMemoryGateway when no gateway class is given', () => {
    registerModel(Invoice as unknown as { name: string; resource?: string });
    expect(modelRegistry.resolve(Invoice).gateway).toBeInstanceOf(InMemoryGateway);
  });

  it('uses the explicit HttpGateway when passed', () => {
    registerModel(Receipt as unknown as { name: string; resource?: string }, HttpGateway);
    expect(modelRegistry.resolve(Receipt).gateway).toBeInstanceOf(HttpGateway);
  });

  it('still accepts an options object as the 2nd arg (overload disambiguation)', () => {
    class Ledger {
      static resource = '/ledgers';
    }
    registerModel(Ledger as unknown as { name: string; resource?: string }, { idKey: 'uuid' });
    const reg = modelRegistry.resolve(Ledger);
    expect(reg.idKey).toBe('uuid');
    expect(reg.gateway).toBeInstanceOf(InMemoryGateway);
  });

  it('throws when resource is missing', () => {
    class NoResource {}
    expect(() =>
      registerModel(NoResource as unknown as { name: string; resource?: string }),
    ).toThrow(/resource/i);
  });

  it('registerModel(M, DbGateway) with a configured databaseAdapter calls ensureCollection(resource)', () => {
    const ensureCollection = vi.fn(async () => {});
    const adapter: DatabaseAdapter = {
      ensureCollection,
      get: async () => null,
      getAll: async () => [],
      query: async () => [],
      insert: async (_r, row) => row,
      update: async (_r, _id, row) => row,
      delete: async () => {},
    };
    resetConfig();
    configureSublime({ platform: 'web', databaseAdapter: adapter });

    class Photo {
      static resource = '/photos';
    }
    registerModel(Photo as unknown as { name: string; resource?: string }, DbGateway);

    expect(modelRegistry.resolve(Photo).gateway).toBeInstanceOf(DbGateway);
    expect(ensureCollection).toHaveBeenCalledWith('/photos');
  });
});
```
```ts
// framework/test/modelRegistry.test.ts
import { describe, it, expect } from 'vitest';
import { modelRegistry } from '../src/discovery/modelRegistry.js';
import { HttpGateway } from '../src/gateway/HttpGateway.js';
import { createModelSlice } from '../src/store/createModelSlice.js';
import { store } from '../src/store/store.js';

class Thing {}

describe('modelRegistry', () => {
  it('registers and resolves a model registration', () => {
    const slice = createModelSlice('things', { idKey: 'id' });
    const gateway = new HttpGateway({
      resource: '/things',
      idKey: 'id',
      sliceName: 'things',
      actions: slice.actions,
      store,
    });
    const reg = { gateway, sliceName: 'things', actions: slice.actions, idKey: 'id' };
    modelRegistry.register(Thing, reg);
    expect(modelRegistry.resolve(Thing)).toBe(reg);
  });

  it('throws for an unregistered model', () => {
    class Unknown {}
    expect(() => modelRegistry.resolve(Unknown)).toThrow(/not registered/i);
  });
});
```
- [ ] **Step 2: Run the tests, verify they fail**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/register.test.ts test/modelRegistry.test.ts`
Expected: FAIL — `register.ts` still does `new Gateway(resource)` with no overloads (default is HTTP, not InMemory; `toBeInstanceOf(InMemoryGateway)` fails) and `modelRegistry.test.ts` cannot import `HttpGateway`.
- [ ] **Step 3: Rewrite register.ts + retype modelRegistry.ts (complete code)**
```ts
// framework/src/register.ts
import { createModelSlice } from './store/createModelSlice.js';
import { registerReducer, store } from './store/store.js';
import { modelRegistry } from './discovery/modelRegistry.js';
import type { GatewayClass, GatewayDeps } from './gateway/GatewayDeps.js';
import { InMemoryGateway } from './gateway/InMemoryGateway.js';
import { DbGateway } from './gateway/DbGateway.js';
import { getConfig } from './config/Config.js';

interface RegisterOpts {
  name?: string;
  idKey?: string;
}

// Accepts a Model subclass. `resource` is read internally; it is intentionally
// not part of this type so subclasses can keep it `protected static` without a
// public/protected mismatch.
type ModelLike = { name: string };

export function registerModel(
  ModelClass: ModelLike,
  gateway: GatewayClass,
  opts?: RegisterOpts,
): void;
export function registerModel(ModelClass: ModelLike, opts?: RegisterOpts): void;
export function registerModel(
  ModelClass: ModelLike,
  arg2?: GatewayClass | RegisterOpts,
  arg3?: RegisterOpts,
): void {
  // A class is callable (typeof === 'function'); an options object is not.
  const GatewayCtor: GatewayClass =
    typeof arg2 === 'function' ? arg2 : InMemoryGateway;
  const opts: RegisterOpts =
    typeof arg2 === 'function' ? arg3 ?? {} : arg2 ?? {};

  const resource = (ModelClass as { resource?: string }).resource;
  if (!resource) {
    throw new Error(
      `Model "${ModelClass.name}" is missing a static "resource" (e.g. protected static resource = '/users').`,
    );
  }
  const sliceName = opts.name ?? `${ModelClass.name.toLowerCase()}s`;
  const idKey = opts.idKey ?? 'id';

  const slice = createModelSlice(sliceName, { idKey });
  registerReducer(slice.name, slice.reducer);

  const deps: GatewayDeps = {
    resource,
    idKey,
    sliceName,
    actions: slice.actions,
    store,
  };
  const gateway = new GatewayCtor(deps);

  if (GatewayCtor === DbGateway && getConfig().databaseAdapter !== undefined) {
    void getConfig().databaseAdapter!.ensureCollection(resource);
  }

  modelRegistry.register(ModelClass as unknown as abstract new (...args: never[]) => object, {
    gateway,
    sliceName,
    actions: slice.actions,
    idKey,
  });
}
```
```ts
// framework/src/discovery/modelRegistry.ts
import type { Gateway } from '../gateway/Gateway.js';
import type { ModelSlice } from '../store/createModelSlice.js';

export interface ModelRegistration {
  gateway: Gateway;
  sliceName: string;
  actions: ModelSlice['actions'];
  idKey: string;
}

/** A class constructor used as a registry key (carries a `.name`). */
type ModelCtor = abstract new (...args: never[]) => object;

const registrations = new Map<ModelCtor, ModelRegistration>();

export const modelRegistry = {
  register(ctor: ModelCtor, reg: ModelRegistration): void {
    registrations.set(ctor, reg);
  },
  resolve(ctor: ModelCtor): ModelRegistration {
    const reg = registrations.get(ctor);
    if (!reg) {
      throw new Error(
        `Model "${ctor.name}" is not registered. Call registerModel(${ctor.name}) after defining it.`,
      );
    }
    return reg;
  },
};
```
Note: `modelRegistry.ts:1` already imports `Gateway` as `type` from `../gateway/Gateway.js`; once Phase B/C rewrites `Gateway.ts` into the interface, this type import resolves to the interface with no textual edit beyond what is shown (kept verbatim for completeness).
- [ ] **Step 4: Run the tests, verify they pass**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/register.test.ts test/modelRegistry.test.ts`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add framework/src/register.ts framework/src/discovery/modelRegistry.ts framework/test/register.test.ts framework/test/modelRegistry.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "feat(framework): registerModel overloads with GatewayDeps factory and in-memory default"
```

---

### Task F3: Model refactor — raw rows, DataError normalization, request-capable call(), Query

**Files:**
- Modify: `framework/src/model/Model.ts:8` (import `DataError`/`isRequestCapable` instead of `ApiError`), `:38-50` (`fail`), `:52-65` (`all`), `:67-80` (`find`), `:82-101` (`save`), `:103-115` (`delete`), `:117-136` (`call`), `:142-166` (`rxAll`)
- Modify: `framework/src/store/createModelSlice.ts:2` (import), `:12` (`error` type), `:57` (`setError` payload type)
- Modify: `framework/src/model/ModelCollection.ts:1` (import), `:6` (`CollectionMeta.error`), `:12` (`error` field)
- Test: `framework/test/Model.commands.test.ts`, `framework/test/Model.rx.test.tsx`, `framework/test/integration.test.ts`, `framework/test/store-serializable.test.ts`, `framework/test/createModelSlice.test.ts`

**Interfaces:**
- Consumes: `DataError`, `NetworkError` (from `../errors/...`); `isRequestCapable` (from `../gateway/Gateway.js`); `Query`, `LegacyQuery`, `normalizeQuery` (from `../gateway/Query.js`); `HttpGateway` (test only); existing `hydrate`, `toPlain`, `modelRegistry`, `store`, `useAppSelector`, `ModelCollection`
- Produces: `Model` reads raw `Row`/`Row[]` from the gateway (no `res.data`); `fail()` normalizes any throw → `DataError`; `call()` throws `DataError{code:'unsupported'}` on a non-request-capable gateway; `all()`/`rxAll()` accept `Query | LegacyQuery`; slice/collection `error` typed `DataError | null`

- [ ] **Step 1: Migrate the failing tests (all five files)**
```ts
// framework/test/Model.commands.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Model } from '../src/model/Model.js';
import { ModelCollection } from '../src/model/ModelCollection.js';
import { DataError } from '../src/errors/DataError.js';
import { HttpGateway } from '../src/gateway/HttpGateway.js';
import { registerModel } from '../src/register.js';
import { store } from '../src/store/store.js';
import { configureSublime, resetConfig } from '../src/config/Config.js';

class Widget extends Model {
  protected static override resource = '/widgets';
  declare id: number;
  declare name: string;
  get shout(): string { return this.name.toUpperCase(); }
}
registerModel(Widget as unknown as { name: string; resource?: string }, HttpGateway);

function respond(json: unknown, status = 200) {
  vi.stubGlobal('fetch', async () => ({ ok: status < 300, status, json: async () => json } as Response));
}

describe('Model commands', () => {
  beforeEach(() => {
    resetConfig();
    configureSublime({
      baseURL: 'https://api.example.com',
      tokenProvider: async () => null,
      storageAdapter: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} },
      platform: 'web',
    });
    store.dispatch({ type: 'widgets/reset' });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('all() fetches, hydrates, caches plain JSON, returns a collection', async () => {
    respond({ success: true, message: '', data: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }], errors: null });
    const widgets = await Widget.all();
    expect(widgets).toBeInstanceOf(ModelCollection);
    expect(widgets.first()).toBeInstanceOf(Widget);
    expect(widgets.first()!.shout).toBe('A');
    const state = store.getState() as Record<string, { items: unknown[] }>;
    expect(state['widgets']!.items).toEqual([{ id: 1, name: 'a' }, { id: 2, name: 'b' }]);
    // store holds plain objects, not Widget instances
    expect(state['widgets']!.items[0]).not.toBeInstanceOf(Widget);
  });

  it('find() returns a hydrated instance and upserts', async () => {
    respond({ success: true, message: '', data: { id: 5, name: 'z' }, errors: null });
    const w = await Widget.find(5);
    expect(w).toBeInstanceOf(Widget);
    expect(w!.name).toBe('z');
  });

  it('save() POSTs a new instance and caches it', async () => {
    respond({ success: true, message: '', data: { id: 9, name: 'new' }, errors: null });
    const w = await Widget.make({ name: 'new' }).save();
    expect(w.id).toBe(9);
    const state = store.getState() as Record<string, { items: { id: number }[] }>;
    expect(state['widgets']!.items.some((i) => i.id === 9)).toBe(true);
  });

  it('call({ store:false }) returns data and does NOT touch the store', async () => {
    respond({ success: true, message: '', data: { count: 42 }, errors: null });
    const report = await Widget.call<{ count: number }>({ url: '/widgets/report', store: false });
    expect(report).toEqual({ count: 42 });
    const state = store.getState() as Record<string, { items: unknown[] }>;
    expect(state['widgets']!.items).toEqual([]);
  });

  it('rejects with DataError and records slice error on failure', async () => {
    respond({ success: false, message: 'boom', data: null, errors: { x: ['y'] } }, 500);
    await expect(Widget.all()).rejects.toBeInstanceOf(DataError);
    const state = store.getState() as Record<string, { error: { code: string } | null }>;
    expect(state['widgets']!.error?.code).toBe('http');
  });
});
```
```tsx
// framework/test/Model.rx.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { Model } from '../src/model/Model.js';
import { ModelCollection } from '../src/model/ModelCollection.js';
import { HttpGateway } from '../src/gateway/HttpGateway.js';
import { registerModel } from '../src/register.js';
import { store } from '../src/store/store.js';
import { configureSublime, resetConfig } from '../src/config/Config.js';
import { renderRx } from '../src/test-utils/renderRx.js';

class Gadget extends Model {
  protected static override resource = '/gadgets';
  declare id: number;
  declare label: string;
}
registerModel(Gadget as unknown as { name: string; resource?: string }, HttpGateway);

describe('Model rx reads', () => {
  beforeEach(() => {
    resetConfig();
    configureSublime({
      baseURL: 'https://api.example.com',
      tokenProvider: async () => null,
      storageAdapter: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} },
      platform: 'web',
    });
    store.dispatch({ type: 'gadgets/reset' });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('rxAll auto-fetches on idle, then serves a reactive hydrated collection', async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true, status: 200,
      json: async () => ({ success: true, message: '', data: [{ id: 1, label: 'x' }], errors: null }),
    } as Response));
    vi.stubGlobal('fetch', fetchSpy);

    const { result } = renderRx(() => Gadget.rxAll());
    expect(result.current).toBeInstanceOf(ModelCollection);
    expect(result.current.loading).toBe(true); // idle → kicked off a fetch

    await waitFor(() => expect(result.current.length).toBe(1));
    expect(result.current.first()).toBeInstanceOf(Gadget);
    expect(result.current.first()!.label).toBe('x');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('rxAll serves cache without refetching when already loaded', async () => {
    store.dispatch({ type: 'gadgets/setItems', payload: [{ id: 2, label: 'cached' }] });
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const { result } = renderRx(() => Gadget.rxAll());
    expect(result.current.length).toBe(1);
    expect(result.current.first()!.label).toBe('cached');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
```
```ts
// framework/test/integration.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Model, registerModel, configureSublime, store, HttpGateway } from '../src/index.js';
import { resetConfig } from '../src/config/Config.js';

class User extends Model {
  protected static override resource = '/users';
  declare id: number;
  declare name: string;
  declare licenceExpiresAt: string;
  get hasExpiredLicence(): boolean {
    return new Date(this.licenceExpiresAt) < new Date('2026-06-18');
  }
  static expired() {
    return this.call<User[]>({ url: '/users/expired', store: true, merge: 'replace' });
  }
}
registerModel(User as unknown as { name: string; resource?: string }, HttpGateway);

describe('framework end-to-end (hand-written model)', () => {
  beforeEach(() => {
    resetConfig();
    configureSublime({
      baseURL: 'https://api.example.com',
      tokenProvider: async () => 'tok',
      storageAdapter: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} },
      platform: 'mobile',
    });
    store.dispatch({ type: 'users/reset' });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('loads, caches plain JSON, hydrates getters, and passes a custom store:true call', async () => {
    vi.stubGlobal('fetch', async (url: string) => {
      const data = url.endsWith('/expired')
        ? [{ id: 3, name: 'old', licenceExpiresAt: '2020-01-01' }]
        : [
            { id: 1, name: 'a', licenceExpiresAt: '2030-01-01' },
            { id: 2, name: 'b', licenceExpiresAt: '2020-01-01' },
          ];
      return { ok: true, status: 200, json: async () => ({ success: true, message: '', data, errors: null }) } as Response;
    });

    const users = await User.all();
    expect(users.length).toBe(2);
    expect(users.where('hasExpiredLicence', true).map((u) => u.id)).toEqual([2]);

    // store holds plain objects only
    const state = store.getState() as Record<string, { items: unknown[] }>;
    expect(state['users']!.items[0]).not.toBeInstanceOf(User);
    expect(Object.getPrototypeOf(state['users']!.items[0])).toBe(Object.prototype);

    const expired = await User.expired();
    expect(expired.map((u) => u.id)).toEqual([3]);
    expect(state['users']).toBeDefined();
  });
});
```
```ts
// framework/test/store-serializable.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createModelSlice } from '../src/store/createModelSlice.js';
import { store, registerReducer } from '../src/store/store.js';
import { NetworkError } from '../src/errors/NetworkError.js';

describe('store serializableCheck ignores DataError in slice.error', () => {
  afterEach(() => vi.restoreAllMocks());

  it('does not warn when a NetworkError is dispatched into slice.error', () => {
    const slice = createModelSlice('serialtest', { idKey: 'id' });
    registerReducer(slice.name, slice.reducer);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    store.dispatch(
      slice.actions.setError(new NetworkError('offline', { url: '/x' })),
    );
    const calls = spy.mock.calls.map((c) => String(c[0]));
    expect(calls.some((m) => m.includes('non-serializable'))).toBe(false);
  });
});
```
```ts
// framework/test/createModelSlice.test.ts
import { describe, it, expect } from 'vitest';
import { createModelSlice } from '../src/store/createModelSlice.js';

function make() {
  const slice = createModelSlice('users', { idKey: 'id' });
  let state = slice.reducer(undefined, { type: '@@init' });
  const apply = (action: { type: string; payload?: unknown }) => {
    state = slice.reducer(state, action);
    return state;
  };
  return { slice, get: () => state, apply };
}

describe('createModelSlice', () => {
  it('starts idle and empty', () => {
    const { get } = make();
    expect(get()).toEqual({ items: [], activeId: null, status: 'idle', error: null });
  });

  it('setItems replaces the collection and marks success', () => {
    const { slice, apply, get } = make();
    apply(slice.actions.setItems([{ id: 1 }, { id: 2 }]));
    expect(get().items).toEqual([{ id: 1 }, { id: 2 }]);
    expect(get().status).toBe('success');
  });

  it('upsertItem inserts or replaces by idKey', () => {
    const { slice, apply, get } = make();
    apply(slice.actions.setItems([{ id: 1, n: 'a' }]));
    apply(slice.actions.upsertItem({ id: 1, n: 'b' })); // replace
    apply(slice.actions.upsertItem({ id: 2, n: 'c' })); // insert
    expect(get().items).toEqual([{ id: 1, n: 'b' }, { id: 2, n: 'c' }]);
  });

  it('removeItem deletes by id', () => {
    const { slice, apply, get } = make();
    apply(slice.actions.setItems([{ id: 1 }, { id: 2 }]));
    apply(slice.actions.removeItem(1));
    expect(get().items).toEqual([{ id: 2 }]);
  });

  it('setStatus and setError track async state', () => {
    const { slice, apply, get } = make();
    apply(slice.actions.setStatus('loading'));
    expect(get().status).toBe('loading');
    apply(slice.actions.setError({ name: 'HttpError', message: 'x', code: 'http', status: 500, errors: null, url: '/u' } as never));
    expect(get().status).toBe('error');
    expect(get().error).toMatchObject({ code: 'http' });
  });
});
```
- [ ] **Step 2: Run the tests, verify they fail**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/Model.commands.test.ts test/Model.rx.test.tsx test/integration.test.ts test/store-serializable.test.ts test/createModelSlice.test.ts`
Expected: FAIL — `Model.ts` still reads `res.data` (gateway now returns raw `Row`, so `res.data` is `undefined` and `setItems(undefined)` blows up / collections empty); imports of `../src/errors/...` resolve but `fail()` still constructs `ApiError`; `state['widgets'].error?.code` is `undefined`.
- [ ] **Step 3: Refactor Model.ts + createModelSlice.ts + ModelCollection.ts (complete code)**
```ts
// framework/src/model/Model.ts
import { useEffect } from 'react';
import { modelRegistry } from '../discovery/modelRegistry.js';
import { store } from '../store/store.js';
import { useAppSelector } from '../store/hooks.js';
import type { ModelSliceState } from '../store/createModelSlice.js';
import { hydrate, toPlain } from './cast.js';
import { ModelCollection } from './ModelCollection.js';
import { DataError } from '../errors/DataError.js';
import { isRequestCapable } from '../gateway/Gateway.js';
import { normalizeQuery, type Query, type LegacyQuery } from '../gateway/Query.js';
import type { RequestConfig } from '../gateway/http.js';

export type ModelCtor<T extends Model> = (new (
  attrs?: Record<string, unknown>,
) => T) &
  typeof Model;

export interface CallConfig<R> extends RequestConfig {
  store?: boolean;
  merge?: 'replace' | 'upsert' | 'remove';
  select?: (data: unknown) => R;
}

export class Model {
  protected static resource: string;

  constructor(attrs: Record<string, unknown> = {}) {
    Object.assign(this, attrs);
  }

  static make<T extends Model>(this: ModelCtor<T>, attrs: Partial<T>): T {
    return new this(attrs as Record<string, unknown>);
  }

  /** Resolves this model's gateway/slice/actions from the registry. */
  private static reg() {
    return modelRegistry.resolve(this);
  }

  /** Normalizes any throw into a DataError, records it in the slice, rethrows. */
  private static fail(error: unknown): never {
    const dataError =
      error instanceof DataError
        ? error
        : new DataError(error instanceof Error ? error.message : 'Unknown error', {
            cause: error,
          });
    console.error(`[${this.name}] ${dataError.message}`, dataError);
    store.dispatch(this.reg().actions.setError(dataError));
    throw dataError;
  }

  static async all<T extends Model>(
    this: ModelCtor<T>,
    query?: Query | LegacyQuery,
  ): Promise<ModelCollection<T>> {
    const reg = (this as typeof Model).reg();
    try {
      store.dispatch(reg.actions.setStatus('loading'));
      const rows = await reg.gateway.index(normalizeQuery(query));
      store.dispatch(reg.actions.setItems(rows));
      return new ModelCollection<T>(rows.map((p) => hydrate(this, p) as T));
    } catch (error) {
      return (this as typeof Model).fail(error);
    }
  }

  static async find<T extends Model>(
    this: ModelCtor<T>,
    id: string | number,
  ): Promise<T | null> {
    const reg = (this as typeof Model).reg();
    try {
      const row = await reg.gateway.show(id);
      if (row === null) return null;
      store.dispatch(reg.actions.upsertItem(row));
      return hydrate(this, row) as T;
    } catch (error) {
      return (this as typeof Model).fail(error);
    }
  }

  async save(): Promise<this> {
    const ctor = this.constructor as typeof Model;
    const reg = ctor.reg();
    const plain = toPlain(this);
    const id = plain[reg.idKey];
    try {
      const row =
        id === undefined || id === null
          ? await reg.gateway.create(plain)
          : await reg.gateway.update(id as string | number, plain);
      store.dispatch(reg.actions.upsertItem(row));
      Object.assign(this, row);
      return this;
    } catch (error) {
      return ctor.fail(error);
    }
  }

  async delete(): Promise<void> {
    const ctor = this.constructor as typeof Model;
    const reg = ctor.reg();
    const id = (toPlain(this) as Record<string, unknown>)[reg.idKey];
    try {
      if (id !== undefined && id !== null) {
        await reg.gateway.destroy(id as string | number);
        store.dispatch(reg.actions.removeItem(id as string | number));
      }
    } catch (error) {
      ctor.fail(error);
    }
  }

  static async call<R>(this: ModelCtor<Model>, config: CallConfig<R>): Promise<R> {
    const reg = (this as typeof Model).reg();
    if (!isRequestCapable(reg.gateway)) {
      return (this as typeof Model).fail(
        new DataError(
          `Model.call() requires a request-capable gateway (HttpGateway). "${this.name}" is not HTTP-backed.`,
          { code: 'unsupported' },
        ),
      );
    }
    try {
      const res = await reg.gateway.request<unknown>(config);
      const payload = (config.select ? config.select(res) : res) as R;
      if (config.store) {
        const merge = config.merge ?? 'replace';
        const rows = (Array.isArray(payload) ? payload : [payload]) as Record<
          string,
          unknown
        >[];
        if (merge === 'replace') store.dispatch(reg.actions.setItems(rows));
        else if (merge === 'upsert') store.dispatch(reg.actions.upsertItems(rows));
        else for (const r of rows) store.dispatch(reg.actions.removeItem(r[reg.idKey] as string | number));
      }
      return payload;
    } catch (error) {
      return (this as typeof Model).fail(error);
    }
  }

  // NOTE: `rxAll`/`rxFind` are React hooks — they call `useAppSelector`/`useEffect`
  // internally, so they MUST be called from a component's render body, per the
  // Rules of Hooks. They return plain reactive snapshots; the fetch side effects
  // run via `useEffect` when the slice status is `idle`.
  static rxAll<T extends Model>(
    this: ModelCtor<T>,
    query?: Query | LegacyQuery,
  ): ModelCollection<T> {
    const ctor = this as typeof Model;
    const reg = ctor.reg();
    const slice = useAppSelector(
      (s) => s[reg.sliceName],
    ) as ModelSliceState | undefined;
    const status = slice?.status ?? 'idle';
    const items = slice?.items ?? [];

    useEffect(() => {
      if (status === 'idle') void ctor.all.call(this, query);
    }, [status]);

    return new ModelCollection<T>(
      items.map((p) => hydrate(this, p) as T),
      {
        loading: status === 'idle' || status === 'loading',
        error: slice?.error ?? null,
        refetch: () => void ctor.all.call(this, query),
      },
    );
  }

  static rxFind<T extends Model>(
    this: ModelCtor<T>,
    id: string | number,
  ): T | null {
    const ctor = this as typeof Model;
    const reg = ctor.reg();
    const slice = useAppSelector(
      (s) => s[reg.sliceName],
    ) as ModelSliceState | undefined;
    const status = slice?.status ?? 'idle';
    const found = (slice?.items ?? []).find((p) => p[reg.idKey] === id);

    useEffect(() => {
      if (!found && status === 'idle') void ctor.find.call(this, id);
    }, [status, id]);

    return found ? (hydrate(this, found) as T) : null;
  }
}
```
```ts
// framework/src/store/createModelSlice.ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { DataError } from '../errors/DataError.js';

export type ModelStatus = 'idle' | 'loading' | 'success' | 'error';

type PlainEntity = Record<string, unknown>;

export interface ModelSliceState {
  items: PlainEntity[];
  activeId: string | number | null;
  status: ModelStatus;
  error: DataError | null;
}

export function createModelSlice(name: string, opts: { idKey: string }) {
  const { idKey } = opts;
  const initialState: ModelSliceState = {
    items: [],
    activeId: null,
    status: 'idle',
    error: null,
  };

  const slice = createSlice({
    name,
    initialState,
    reducers: {
      setItems: (state, action: PayloadAction<PlainEntity[]>) => {
        state.items = action.payload;
        state.status = 'success';
        state.error = null;
      },
      upsertItems: (state, action: PayloadAction<PlainEntity[]>) => {
        for (const incoming of action.payload) {
          const i = state.items.findIndex((it) => it[idKey] === incoming[idKey]);
          if (i === -1) state.items.push(incoming);
          else state.items[i] = incoming;
        }
        state.status = 'success';
        state.error = null;
      },
      upsertItem: (state, action: PayloadAction<PlainEntity>) => {
        const incoming = action.payload;
        const i = state.items.findIndex((it) => it[idKey] === incoming[idKey]);
        if (i === -1) state.items.push(incoming);
        else state.items[i] = incoming;
      },
      removeItem: (state, action: PayloadAction<string | number>) => {
        state.items = state.items.filter((it) => it[idKey] !== action.payload);
      },
      setActive: (state, action: PayloadAction<string | number | null>) => {
        state.activeId = action.payload;
      },
      setStatus: (state, action: PayloadAction<ModelStatus>) => {
        state.status = action.payload;
      },
      setError: (state, action: PayloadAction<DataError | null>) => {
        state.error = action.payload;
        state.status = action.payload ? 'error' : state.status;
      },
      reset: () => initialState,
    },
  });

  return { name, reducer: slice.reducer, actions: slice.actions };
}

export type ModelSlice = ReturnType<typeof createModelSlice>;
```
```ts
// framework/src/model/ModelCollection.ts
import type { DataError } from '../errors/DataError.js';

export interface CollectionMeta {
  loading: boolean;
  error: DataError | null;
  refetch: () => void;
}

export class ModelCollection<T> implements Iterable<T> {
  readonly items: T[];
  readonly loading: boolean;
  readonly error: DataError | null;
  readonly refetch: () => void;

  constructor(items: T[], meta: Partial<CollectionMeta> = {}) {
    this.items = items;
    this.loading = meta.loading ?? false;
    this.error = meta.error ?? null;
    this.refetch = meta.refetch ?? ((): void => {});
  }

  get length(): number {
    return this.items.length;
  }

  private withItems(items: T[]): ModelCollection<T> {
    return new ModelCollection<T>(items, {
      loading: this.loading,
      error: this.error,
      refetch: this.refetch,
    });
  }

  where<K extends keyof T>(key: K, value: T[K]): ModelCollection<T> {
    return this.withItems(this.items.filter((item) => item[key] === value));
  }

  whereIn<K extends keyof T>(key: K, values: T[K][]): ModelCollection<T> {
    return this.withItems(this.items.filter((item) => values.includes(item[key])));
  }

  sortBy<K extends keyof T>(key: K): ModelCollection<T> {
    const sorted = [...this.items].sort((a, b) =>
      a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0,
    );
    return this.withItems(sorted);
  }

  find(predicate: (item: T) => boolean): T | undefined {
    return this.items.find(predicate);
  }

  first(): T | undefined {
    return this.items[0];
  }

  map<U>(fn: (item: T, i: number) => U): U[] {
    return this.items.map(fn);
  }

  filter(fn: (item: T, i: number) => boolean): ModelCollection<T> {
    return this.withItems(this.items.filter(fn));
  }

  toArray(): T[] {
    return [...this.items];
  }

  [Symbol.iterator](): Iterator<T> {
    return this.items[Symbol.iterator]();
  }
}
```
- [ ] **Step 4: Run the tests, verify they pass**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/Model.commands.test.ts test/Model.rx.test.tsx test/integration.test.ts test/store-serializable.test.ts test/createModelSlice.test.ts`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add framework/src/model/Model.ts framework/src/store/createModelSlice.ts framework/src/model/ModelCollection.ts framework/test/Model.commands.test.ts framework/test/Model.rx.test.tsx framework/test/integration.test.ts framework/test/store-serializable.test.ts framework/test/createModelSlice.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "refactor(framework): Model reads raw rows, normalizes throws to DataError, call() requires request-capable gateway"
```

---

### Task F4: Barrel — export error tree, gateway types, Query, DatabaseAdapter, config getters

**Files:**
- Modify: `framework/src/index.ts:1-16` (full rewrite of the barrel)
- Test: `framework/test/barrel.test.ts` (create)

**Interfaces:**
- Consumes: `Model`, `ModelCollection`, `CallConfig`, `ModelCtor` (model); `registerModel` (register); `configureSublime`, `getConfig`, `getHttpConfig`, `getDatabaseAdapter`, `SublimeConfig`, `StorageAdapter` (config); `DataError`, `HttpError`, `NetworkError`, `AuthError`, `ValidationError`, `NotFoundError`, `ConfigError`, `StorageError`, `DataErrorCode` (errors); `ApiError` alias (`gateway/ApiError.js` shim → `HttpError`); `Gateway`, `Row`, `Id`, `RequestCapableGateway`, `isRequestCapable` (`gateway/Gateway.js`); `HttpGateway`, `InMemoryGateway`, `DbGateway`; `Query`, `FilterOp`, `FilterValue`, `QueryFilter`, `QuerySort`, `LegacyQuery` (`gateway/Query.js`); `DatabaseAdapter` (`gateway/DatabaseAdapter.js`); `ApiResponse` (HTTP-internal); store/hooks (unchanged)
- Produces: the public `@sublime-ui/framework` barrel; `ApiError === HttpError` at runtime; no constructable `Gateway` export

- [ ] **Step 1: Write the failing test**
```ts
// framework/test/barrel.test.ts
import { describe, it, expect } from 'vitest';
import * as Sublime from '../src/index.js';
import {
  Model,
  ModelCollection,
  registerModel,
  configureSublime,
  getConfig,
  getHttpConfig,
  getDatabaseAdapter,
  ApiError,
  HttpError,
  DataError,
  NetworkError,
  AuthError,
  ValidationError,
  NotFoundError,
  ConfigError,
  StorageError,
  HttpGateway,
  InMemoryGateway,
  DbGateway,
  isRequestCapable,
  store,
  registerReducer,
  useAppDispatch,
  useAppSelector,
} from '../src/index.js';

describe('public barrel (@sublime-ui/framework)', () => {
  it('exports the value runtime surface', () => {
    expect(Model).toBeTypeOf('function');
    expect(ModelCollection).toBeTypeOf('function');
    expect(registerModel).toBeTypeOf('function');
    expect(configureSublime).toBeTypeOf('function');
    expect(getConfig).toBeTypeOf('function');
    expect(getHttpConfig).toBeTypeOf('function');
    expect(getDatabaseAdapter).toBeTypeOf('function');
    expect(store).toBeTypeOf('object');
    expect(registerReducer).toBeTypeOf('function');
    expect(useAppDispatch).toBeTypeOf('function');
    expect(useAppSelector).toBeTypeOf('function');
    expect(isRequestCapable).toBeTypeOf('function');
  });

  it('exports the three gateway strategy classes', () => {
    expect(HttpGateway).toBeTypeOf('function');
    expect(InMemoryGateway).toBeTypeOf('function');
    expect(DbGateway).toBeTypeOf('function');
  });

  it('exports the full DataError tree', () => {
    for (const E of [DataError, HttpError, NetworkError, AuthError, ValidationError, NotFoundError, ConfigError, StorageError]) {
      expect(E).toBeTypeOf('function');
    }
    expect(HttpError.prototype).toBeInstanceOf(DataError);
  });

  it('keeps ApiError as a back-compat alias of HttpError', () => {
    expect(ApiError).toBe(HttpError);
  });

  it('no longer exports a constructable Gateway', () => {
    expect((Sublime as Record<string, unknown>)['Gateway']).toBeUndefined();
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/barrel.test.ts`
Expected: FAIL — the current barrel does not export `HttpGateway`/`InMemoryGateway`/`DbGateway`/`getHttpConfig`/`getDatabaseAdapter`/the error tree/`isRequestCapable`, and it still exports `Gateway` (so `'Gateway'` is not `undefined`); `ApiError === HttpError` cannot be verified because `HttpError` is not exported.
- [ ] **Step 3: Rewrite index.ts (complete code)**
```ts
// framework/src/index.ts

// --- Model layer ---
export { Model } from './model/Model.js';
export { ModelCollection } from './model/ModelCollection.js';
export type { CallConfig, ModelCtor } from './model/Model.js';
export { registerModel } from './register.js';

// --- Config ---
export {
  configureSublime,
  getConfig,
  getHttpConfig,
  getDatabaseAdapter,
  type SublimeConfig,
  type StorageAdapter,
} from './config/Config.js';

// --- Error tree (transport-neutral) ---
export { DataError, type DataErrorCode } from './errors/DataError.js';
export { HttpError } from './gateway/HttpError.js';
export { NetworkError } from './errors/NetworkError.js';
export { AuthError } from './errors/AuthError.js';
export { ValidationError } from './errors/ValidationError.js';
export { NotFoundError } from './errors/NotFoundError.js';
export { ConfigError } from './errors/ConfigError.js';
export { StorageError } from './errors/StorageError.js';
// Back-compat: ApiError is the old name for HttpError (runtime value alias).
export { ApiError } from './gateway/ApiError.js';

// --- Gateway interface + types + strategies ---
export type { Gateway, Row, Id, RequestCapableGateway } from './gateway/Gateway.js';
export { isRequestCapable } from './gateway/Gateway.js';
export type { GatewayDeps, GatewayClass } from './gateway/GatewayDeps.js';
export { HttpGateway } from './gateway/HttpGateway.js';
export { InMemoryGateway } from './gateway/InMemoryGateway.js';
export { DbGateway } from './gateway/DbGateway.js';

// --- Query object ---
export type {
  Query,
  FilterOp,
  FilterValue,
  QueryFilter,
  QuerySort,
  LegacyQuery,
} from './gateway/Query.js';

// --- DatabaseAdapter port (types only; adapters ship in @sublime-ui/storage) ---
export type { DatabaseAdapter } from './gateway/DatabaseAdapter.js';

// --- HTTP-internal (kept for advanced REST consumers; NOT part of the Model
//     data contract — gateways return raw Row, not this envelope). ---
export type { ApiResponse } from './entities/ApiResponse.js';

// --- Store ---
export { store, registerReducer } from './store/store.js';
export type { RootState, AppDispatch } from './store/store.js';
export { useAppDispatch, useAppSelector } from './store/hooks.js';
```
- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/barrel.test.ts`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add framework/src/index.ts framework/test/barrel.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "feat(framework): export error tree, gateway strategies/types, Query, DatabaseAdapter, config getters from barrel"
```


### Task G1: DatabaseAdapter port + DbGateway

**Files:**
- Create: `framework/src/gateway/DatabaseAdapter.ts`
- Create: `framework/src/gateway/DbGateway.ts`
- Test: `framework/test/DbGateway.test.ts`

**Interfaces:**
- Consumes:
  - `Row` (`Record<string, unknown>`), `Id` (`string | number`), `Gateway` interface (`index(query?: Query): Promise<Row[]>; show(id: Id): Promise<Row | null>; create(body: Row): Promise<Row>; update(id: Id, body: Row): Promise<Row>; destroy(id: Id): Promise<void>;`) from `framework/src/gateway/Gateway.ts`
  - `Query` (`{ filters?: QueryFilter[]; sort?: QuerySort[]; limit?: number; offset?: number }`) from `framework/src/gateway/Query.ts`
  - `GatewayDeps` (`{ resource: string; idKey: string; sliceName: string; actions: ModelSlice['actions']; store: Store }`) from `framework/src/gateway/GatewayDeps.ts`
  - `genId(): string` from `framework/src/gateway/genId.ts`
  - `getDatabaseAdapter(): DatabaseAdapter` (throws `ConfigError` if no adapter is configured) from `framework/src/config/Config.ts`
  - `configureSublime(config)`, `resetConfig()` from `framework/src/config/Config.ts` (test setup; `config.databaseAdapter` is the injected `DatabaseAdapter`, `config.platform` is required)
  - `NotFoundError` (extends `DataError`; ctor `(message: string, opts?: { resource?: string; id?: Id; code?: DataErrorCode; cause?: unknown })`) from `framework/src/errors/` — thrown by the adapter's `update()` of a missing id and re-surfaced unchanged by `DbGateway.update`
  - `ConfigError` (extends `DataError`) from `framework/src/errors/` — thrown by `getDatabaseAdapter()` when unset
- Produces:
  - `DatabaseAdapter` interface (`framework/src/gateway/DatabaseAdapter.ts`): `ensureCollection(resource: string): Promise<void>; get(resource: string, id: Id): Promise<Row | null>; getAll(resource: string): Promise<Row[]>; query(resource: string, query: Query): Promise<Row[]>; insert(resource: string, row: Row): Promise<Row>; update(resource: string, id: Id, row: Row): Promise<Row>; delete(resource: string, id: Id): Promise<void>; transaction?<T>(fn: (tx: DatabaseAdapter) => Promise<T>): Promise<T>;`
  - `DbGateway` class (`framework/src/gateway/DbGateway.ts`) implementing `Gateway`, constructed via `new DbGateway(deps: GatewayDeps)`; resolves the adapter through `getDatabaseAdapter()` on every call.

- [ ] **Step 1: Write the failing test**
```ts
// framework/test/DbGateway.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { DbGateway } from '../src/gateway/DbGateway.js';
import type { DatabaseAdapter } from '../src/gateway/DatabaseAdapter.js';
import type { GatewayDeps } from '../src/gateway/GatewayDeps.js';
import type { Row, Id } from '../src/gateway/Gateway.js';
import type { Query } from '../src/gateway/Query.js';
import { applyQuery } from '../src/gateway/queryMatch.js';
import { NotFoundError } from '../src/errors/NotFoundError.js';
import { ConfigError } from '../src/errors/ConfigError.js';
import { configureSublime, resetConfig } from '../src/config/Config.js';
import { store } from '../src/store/store.js';

/** Minimal in-memory DatabaseAdapter for driving DbGateway under test. */
function fakeAdapter(): DatabaseAdapter {
  const tables = new Map<string, Map<string, Row>>();
  const tableFor = (resource: string): Map<string, Row> => {
    let t = tables.get(resource);
    if (!t) {
      t = new Map<string, Row>();
      tables.set(resource, t);
    }
    return t;
  };
  return {
    async ensureCollection(resource: string): Promise<void> {
      tableFor(resource);
    },
    async get(resource: string, id: Id): Promise<Row | null> {
      return tableFor(resource).get(String(id)) ?? null;
    },
    async getAll(resource: string): Promise<Row[]> {
      return [...tableFor(resource).values()].map((r) => ({ ...r }));
    },
    async query(resource: string, query: Query): Promise<Row[]> {
      return applyQuery([...tableFor(resource).values()], query);
    },
    async insert(resource: string, row: Row): Promise<Row> {
      const t = tableFor(resource);
      const key = String(row.id);
      if (t.has(key)) throw new Error(`duplicate id ${key}`);
      const stored = { ...row };
      t.set(key, stored);
      return { ...stored };
    },
    async update(resource: string, id: Id, row: Row): Promise<Row> {
      const t = tableFor(resource);
      const key = String(id);
      const cur = t.get(key);
      if (!cur) throw new NotFoundError(`${resource}#${id} not found`, { resource, id });
      const merged = { ...cur, ...row, id: cur.id };
      t.set(key, merged);
      return { ...merged };
    },
    async delete(resource: string, id: Id): Promise<void> {
      tableFor(resource).delete(String(id));
    },
  };
}

function depsFor(resource: string): GatewayDeps {
  return {
    resource,
    idKey: 'id',
    sliceName: `${resource}slice`,
    actions: {} as GatewayDeps['actions'],
    store,
  };
}

describe('DbGateway', () => {
  beforeEach(() => resetConfig());

  function configure(adapter: DatabaseAdapter): void {
    configureSublime({ platform: 'web', databaseAdapter: adapter });
  }

  it('create() inserts and generates an id when none is supplied', async () => {
    const adapter = fakeAdapter();
    configure(adapter);
    const g = new DbGateway(depsFor('notes'));
    const created = await g.create({ title: 'a' });
    expect(typeof created.id).toBe('string');
    expect(created.title).toBe('a');
    expect(await adapter.get('notes', created.id as Id)).toEqual(created);
  });

  it('create() honours a developer-supplied id', async () => {
    const adapter = fakeAdapter();
    configure(adapter);
    const g = new DbGateway(depsFor('notes'));
    const created = await g.create({ id: 'x1', title: 'a' });
    expect(created.id).toBe('x1');
  });

  it('show() returns the row, then null for an absent id (no throw)', async () => {
    const adapter = fakeAdapter();
    configure(adapter);
    const g = new DbGateway(depsFor('notes'));
    await g.create({ id: 'x1', title: 'a' });
    expect(await g.show('x1')).toMatchObject({ id: 'x1', title: 'a' });
    expect(await g.show('missing')).toBeNull();
  });

  it('index() without a query returns all rows via getAll', async () => {
    const adapter = fakeAdapter();
    configure(adapter);
    const g = new DbGateway(depsFor('notes'));
    await g.create({ id: '1', title: 'a' });
    await g.create({ id: '2', title: 'b' });
    const rows = await g.index();
    expect(rows.map((r) => r.id).sort()).toEqual(['1', '2']);
  });

  it('index() with a query delegates to adapter.query', async () => {
    const adapter = fakeAdapter();
    configure(adapter);
    const g = new DbGateway(depsFor('notes'));
    await g.create({ id: '1', title: 'a', pinned: true });
    await g.create({ id: '2', title: 'b', pinned: false });
    const rows = await g.index({ filters: [{ field: 'pinned', op: 'eq', value: true }] });
    expect(rows.map((r) => r.id)).toEqual(['1']);
  });

  it('update() of an existing row merges and returns it', async () => {
    const adapter = fakeAdapter();
    configure(adapter);
    const g = new DbGateway(depsFor('notes'));
    await g.create({ id: 'x1', title: 'a' });
    const updated = await g.update('x1', { title: 'b' });
    expect(updated).toMatchObject({ id: 'x1', title: 'b' });
  });

  it('update() of a missing id throws NotFoundError', async () => {
    const adapter = fakeAdapter();
    configure(adapter);
    const g = new DbGateway(depsFor('notes'));
    await expect(g.update('nope', { title: 'b' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('destroy() removes the row and is a no-op for a missing id', async () => {
    const adapter = fakeAdapter();
    configure(adapter);
    const g = new DbGateway(depsFor('notes'));
    await g.create({ id: 'x1', title: 'a' });
    await g.destroy('x1');
    expect(await g.show('x1')).toBeNull();
    await expect(g.destroy('x1')).resolves.toBeUndefined();
  });

  it('resolves the adapter per call: throws ConfigError when none is configured', async () => {
    resetConfig();
    const g = new DbGateway(depsFor('notes'));
    await expect(g.index()).rejects.toBeInstanceOf(ConfigError);
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/DbGateway.test.ts`
Expected: FAIL with "Failed to resolve import \"../src/gateway/DbGateway.js\"" (and "../src/gateway/DatabaseAdapter.js"), because neither module exists yet.
- [ ] **Step 3: Create the DatabaseAdapter port (types only) and the DbGateway class (complete code)**
```ts
// framework/src/gateway/DatabaseAdapter.ts
import type { Row, Id } from './Gateway.js';
import type { Query } from './Query.js';

/**
 * Platform-agnostic document-store PORT the DbGateway delegates to. This file is
 * core and contains ZERO runtime native/DOM imports — concrete adapters
 * (SQLite, IndexedDB) ship in @sublime-ui/storage and are injected via
 * configureSublime({ databaseAdapter }).
 *
 * Absence is NOT a failure: get() returns null for a row that does not exist.
 * Real failures throw a typed DataError (StorageError / NotFoundError).
 */
export interface DatabaseAdapter {
  /** Idempotent: ensure storage for `resource` exists. */
  ensureCollection(resource: string): Promise<void>;
  /** Single row by id, or null when absent. */
  get(resource: string, id: Id): Promise<Row | null>;
  /** Every row in the collection; empty -> []. */
  getAll(resource: string): Promise<Row[]>;
  /** Rows matching the neutral Query; no match -> []. */
  query(resource: string, query: Query): Promise<Row[]>;
  /** Insert a new row; duplicate id -> StorageError. */
  insert(resource: string, row: Row): Promise<Row>;
  /** Update an existing row; missing id -> NotFoundError. */
  update(resource: string, id: Id, row: Row): Promise<Row>;
  /** Remove a row; missing id -> no-op. */
  delete(resource: string, id: Id): Promise<void>;
  /** Optional atomic batch; adapters that omit it (e.g. desktop in SP1) let DbGateway fall back to sequential awaits. */
  transaction?<T>(fn: (tx: DatabaseAdapter) => Promise<T>): Promise<T>;
}
```
```ts
// framework/src/gateway/DbGateway.ts
import type { Gateway, Row, Id } from './Gateway.js';
import type { GatewayDeps } from './GatewayDeps.js';
import type { Query } from './Query.js';
import { getDatabaseAdapter } from '../config/Config.js';
import { genId } from './genId.js';

/**
 * One platform-agnostic Gateway over a local document store. It owns no engine:
 * it resolves the configured DatabaseAdapter via getDatabaseAdapter() on every
 * call (so a late configureSublime is honored and a missing adapter surfaces as
 * ConfigError), then delegates. Model remains the single writer to the slice.
 */
export class DbGateway implements Gateway {
  constructor(private readonly deps: GatewayDeps) {}

  async index(query?: Query): Promise<Row[]> {
    const db = getDatabaseAdapter();
    return query ? db.query(this.deps.resource, query) : db.getAll(this.deps.resource);
  }

  async show(id: Id): Promise<Row | null> {
    return getDatabaseAdapter().get(this.deps.resource, id);
  }

  async create(body: Row): Promise<Row> {
    const k = this.deps.idKey;
    const row = body[k] == null ? { ...body, [k]: genId() } : body;
    return getDatabaseAdapter().insert(this.deps.resource, row);
  }

  async update(id: Id, body: Row): Promise<Row> {
    return getDatabaseAdapter().update(this.deps.resource, id, body);
  }

  async destroy(id: Id): Promise<void> {
    await getDatabaseAdapter().delete(this.deps.resource, id);
  }
}
```
- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/DbGateway.test.ts`
Expected: PASS (all 9 cases green)
- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add framework/src/gateway/DatabaseAdapter.ts framework/src/gateway/DbGateway.ts framework/test/DbGateway.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "feat(framework): add DatabaseAdapter port and DbGateway strategy"
```


### Task H1: Scaffold the @sublime-ui/storage workspace

**Files:**
- Create: `storage/package.json`
- Create: `storage/tsconfig.json`
- Create: `storage/tsup.config.ts`
- Create: `storage/vitest.config.ts`
- Create: `storage/test/setup.smoke.test.ts`
- Create: `storage/src/index.ts` (placeholder, replaced in H4)
- Modify: `package.json:18-25` (root `workspaces` array)
- Modify: `.changeset/config.json:5` (the `fixed` array)
- Test: `storage/test/setup.smoke.test.ts`

**Interfaces:**
- Consumes: nothing at runtime (scaffold only); the workspace will dev-depend on `better-sqlite3`, `idb`, `fake-indexeddb`, `@sublime-ui/framework` (workspace), `@sublime-ui/desktop` (workspace, type-only for the desktop driver in H4)
- Produces: the `@sublime-ui/storage` workspace with entry conditions `"."`, `"./web"`, `"./desktop"`, `"./mobile"`; root `workspaces` includes `"storage"`; `.changeset/config.json` `fixed[0]` includes `"@sublime-ui/storage"` so it bumps to 0.2.0 with the rest

> **Context (verified):** the root `workspaces` array today is exactly
> `["framework", "library", "devkit", "ui", "desktop", "create-app"]`
> (`package.json:18-25`). The current changeset `fixed` array is exactly the
> single group
> `[["@sublime-ui/framework", "@sublime-ui/library", "@sublime-ui/ui", "@sublime-ui/desktop", "@sublime-ui/devkit", "@sublime-ui/create-app"]]`
> (`.changeset/config.json:5`). Both must gain the storage entry so the new
> package is a workspace AND part of the fixed version group (0.2.0).

- [ ] **Step 1: Write the failing test**
```ts
// storage/test/setup.smoke.test.ts
import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { openDB } from 'idb';
import 'fake-indexeddb/auto';

describe('@sublime-ui/storage test environment', () => {
  it('runs in node (no DOM document by default)', () => {
    expect(typeof process).toBe('object');
    expect(process.versions.node).toBeTruthy();
  });

  it('can open an in-memory better-sqlite3 database with JSON1', () => {
    const db = new Database(':memory:');
    const row = db.prepare("SELECT json_extract('{\"a\":1}','$.a') AS v").get() as { v: number };
    expect(row.v).toBe(1);
    db.close();
  });

  it('has a fake IndexedDB via fake-indexeddb/auto', async () => {
    expect(typeof indexedDB).toBe('object');
    const db = await openDB('smoke', 1, {
      upgrade(d) {
        d.createObjectStore('things', { keyPath: 'id' });
      },
    });
    await db.put('things', { id: 'x', n: 1 });
    expect(await db.get('things', 'x')).toEqual({ id: 'x', n: 1 });
    db.close();
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage && npx vitest run test/setup.smoke.test.ts`
Expected: FAIL — the `storage` workspace does not exist yet, so npm cannot resolve the directory / `vitest` / `better-sqlite3` / `idb` / `fake-indexeddb` (e.g. "Cannot find module 'better-sqlite3'" or vitest not found in `storage/`).
- [ ] **Step 3a: Create `storage/package.json`**
```json
{
  "name": "@sublime-ui/storage",
  "version": "0.1.2",
  "description": "Platform-resolved DatabaseAdapter implementations (SQLite desktop/mobile, IndexedDB web) and createDatabaseAdapter() for Sublime UI.",
  "keywords": [
    "sublime-ui",
    "storage",
    "sqlite",
    "indexeddb",
    "better-sqlite3",
    "expo-sqlite",
    "idb",
    "cross-platform",
    "typescript"
  ],
  "homepage": "https://sublime-ui.github.io/sublime-ui/",
  "bugs": "https://github.com/sublime-ui/sublime-ui/issues",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/sublime-ui/sublime-ui.git",
    "directory": "storage"
  },
  "license": "MIT",
  "author": "Aaron Mkandawire",
  "publishConfig": {
    "access": "public"
  },
  "type": "module",
  "sideEffects": false,
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./web": {
      "types": "./dist/web.d.ts",
      "import": "./dist/web.js"
    },
    "./desktop": {
      "types": "./dist/desktop.d.ts",
      "import": "./dist/desktop.js"
    },
    "./mobile": {
      "types": "./dist/mobile.d.ts",
      "import": "./dist/mobile.js"
    }
  },
  "files": [
    "dist",
    "src"
  ],
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests",
    "lint": "eslint src"
  },
  "dependencies": {
    "@sublime-ui/framework": "workspace:*"
  },
  "peerDependencies": {
    "better-sqlite3": ">=11",
    "expo-sqlite": ">=14",
    "idb": ">=8",
    "@sublime-ui/desktop": ">=0.1.2"
  },
  "peerDependenciesMeta": {
    "better-sqlite3": {
      "optional": true
    },
    "expo-sqlite": {
      "optional": true
    },
    "idb": {
      "optional": true
    },
    "@sublime-ui/desktop": {
      "optional": true
    }
  },
  "devDependencies": {
    "@sublime-ui/desktop": "workspace:*",
    "@types/better-sqlite3": "^7.6.11",
    "@types/node": "^22",
    "better-sqlite3": "^11.5.0",
    "fake-indexeddb": "^6.0.0",
    "idb": "^8.0.0"
  }
}
```
- [ ] **Step 3b: Create `storage/tsconfig.json`**
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["node"],
    "skipLibCheck": true
  },
  "include": ["src", "test"]
}
```
- [ ] **Step 3c: Create `storage/tsup.config.ts`** (explicit entry points so each `exports` condition maps to a built file; native libs marked `external` so they never enter a consumer's web bundle)
```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/web.ts',
    'src/desktop.ts',
    'src/mobile.ts',
    'src/createDatabaseAdapter.web.ts',
    'src/createDatabaseAdapter.native.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  bundle: false,
  external: ['better-sqlite3', 'expo-sqlite', 'idb', '@sublime-ui/desktop', '@sublime-ui/framework'],
});
```
- [ ] **Step 3d: Create `storage/vitest.config.ts`** (node environment — these adapters are DB/driver code, not React; `fake-indexeddb/auto` supplies `indexedDB` in node). The `@sublime-ui/framework` alias maps to the framework `src` so storage tests (e.g. the cross-backend conformance runner in J1) resolve the workspace from source without a build step.
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@sublime-ui/framework': new URL('../framework/src/index.ts', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['test/**/*.test.{ts,tsx}'],
  },
});
```
- [ ] **Step 3e: Create `storage/src/index.ts`** (placeholder — replaced with the real barrel + resolver in H4; keeps `tsup`/`tsc` from failing on a missing entry)
```ts
// Placeholder barrel — replaced in H4 with the real exports + createDatabaseAdapter().
export {};
```
- [ ] **Step 3f: Modify `package.json:18-25`** — add `"storage"` to the root `workspaces` array
```json
  "workspaces": [
    "framework",
    "library",
    "devkit",
    "ui",
    "desktop",
    "create-app",
    "storage"
  ],
```
- [ ] **Step 3g: Modify `.changeset/config.json:5`** — add `"@sublime-ui/storage"` to the single fixed group
```json
  "fixed": [["@sublime-ui/framework", "@sublime-ui/library", "@sublime-ui/ui", "@sublime-ui/desktop", "@sublime-ui/devkit", "@sublime-ui/create-app", "@sublime-ui/storage"]],
```
- [ ] **Step 3h: Install the new workspace deps from the repo root** so `better-sqlite3`/`idb`/`fake-indexeddb` resolve under `storage/`
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime && npm install`
- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage && npx vitest run test/setup.smoke.test.ts`
Expected: PASS (3 passing — node env, better-sqlite3 JSON1, fake-indexeddb)
- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add storage/package.json storage/tsconfig.json storage/tsup.config.ts storage/vitest.config.ts storage/test/setup.smoke.test.ts storage/src/index.ts package.json package-lock.json .changeset/config.json && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "feat(storage): scaffold @sublime-ui/storage workspace (exports, toolchain, smoke test)"
```

---

### Task H2: IndexedDbAdapter (web) via idb

**Files:**
- Create: `storage/src/web.ts`
- Test: `storage/test/IndexedDbAdapter.test.ts`

**Interfaces:**
- Consumes: from `@sublime-ui/framework` — `applyQuery` (value), `StorageError` (value), `NotFoundError` (value), and types `DatabaseAdapter`, `Row`, `Id`, `Query`, `QueryFilter`; from `idb` — `openDB`, `type IDBPDatabase`
- Produces: `class IndexedDbAdapter implements DatabaseAdapter` (object store per resource, `keyPath: 'id'`; collect-then-open with a version-bump reopen escape hatch); `function createIndexedDbAdapter(dbName?: string): IndexedDbAdapter`

> **Barrel dependency (note for the framework phase):** `applyQuery` must be
> reachable from the published `@sublime-ui/framework` entry. It is produced in
> `framework/src/gateway/queryMatch.ts` (symbol `applyQuery`); the framework
> barrel (`framework/src/index.ts`) must re-export it alongside the error tree,
> `DatabaseAdapter`, `Row`, `Id`, and the `Query` types. This task consumes it
> by symbol name; if the barrel does not yet export it, add
> `export { applyQuery } from './gateway/queryMatch.js';` to
> `framework/src/index.ts` in the framework barrel task.

- [ ] **Step 1: Write the failing test**
```ts
// storage/test/IndexedDbAdapter.test.ts
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { NotFoundError, StorageError } from '@sublime-ui/framework';
import { IndexedDbAdapter } from '../src/web.js';

// Reset the in-memory IndexedDB between tests so DB versions/stores don't leak.
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

describe('IndexedDbAdapter — CRUD', () => {
  it('inserts then gets a row by id', async () => {
    const a = new IndexedDbAdapter('app');
    await a.ensureCollection('notes');
    const created = await a.insert('notes', { id: 'n1', title: 'Hello' });
    expect(created).toEqual({ id: 'n1', title: 'Hello' });
    expect(await a.get('notes', 'n1')).toEqual({ id: 'n1', title: 'Hello' });
  });

  it('get returns null for an absent id', async () => {
    const a = new IndexedDbAdapter('app');
    await a.ensureCollection('notes');
    expect(await a.get('notes', 'missing')).toBeNull();
  });

  it('getAll returns every row (empty -> [])', async () => {
    const a = new IndexedDbAdapter('app');
    await a.ensureCollection('notes');
    expect(await a.getAll('notes')).toEqual([]);
    await a.insert('notes', { id: 'n1', title: 'A' });
    await a.insert('notes', { id: 'n2', title: 'B' });
    const all = await a.getAll('notes');
    expect(all.map((r) => r.id).sort()).toEqual(['n1', 'n2']);
  });

  it('insert of a duplicate id throws StorageError', async () => {
    const a = new IndexedDbAdapter('app');
    await a.ensureCollection('notes');
    await a.insert('notes', { id: 'n1', title: 'A' });
    await expect(a.insert('notes', { id: 'n1', title: 'dup' })).rejects.toBeInstanceOf(StorageError);
  });

  it('update merges and returns the row', async () => {
    const a = new IndexedDbAdapter('app');
    await a.ensureCollection('notes');
    await a.insert('notes', { id: 'n1', title: 'A', pinned: false });
    const updated = await a.update('notes', 'n1', { title: 'A2', pinned: true });
    expect(updated).toEqual({ id: 'n1', title: 'A2', pinned: true });
    expect(await a.get('notes', 'n1')).toEqual({ id: 'n1', title: 'A2', pinned: true });
  });

  it('update of a missing id throws NotFoundError', async () => {
    const a = new IndexedDbAdapter('app');
    await a.ensureCollection('notes');
    await expect(a.update('notes', 'nope', { title: 'x' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('delete removes a row; delete of a missing id is a no-op', async () => {
    const a = new IndexedDbAdapter('app');
    await a.ensureCollection('notes');
    await a.insert('notes', { id: 'n1', title: 'A' });
    await a.delete('notes', 'n1');
    expect(await a.get('notes', 'n1')).toBeNull();
    await expect(a.delete('notes', 'n1')).resolves.toBeUndefined();
  });
});

describe('IndexedDbAdapter — query', () => {
  it('id-only eq filter pushes down to store.get', async () => {
    const a = new IndexedDbAdapter('app');
    await a.ensureCollection('notes');
    await a.insert('notes', { id: 'n1', title: 'A' });
    await a.insert('notes', { id: 'n2', title: 'B' });
    const out = await a.query('notes', { filters: [{ field: 'id', op: 'eq', value: 'n2' }] });
    expect(out).toEqual([{ id: 'n2', title: 'B' }]);
  });

  it('id-only eq filter for an absent id returns []', async () => {
    const a = new IndexedDbAdapter('app');
    await a.ensureCollection('notes');
    const out = await a.query('notes', { filters: [{ field: 'id', op: 'eq', value: 'zzz' }] });
    expect(out).toEqual([]);
  });

  it('non-id filters fall back to getAll + applyQuery', async () => {
    const a = new IndexedDbAdapter('app');
    await a.ensureCollection('notes');
    await a.insert('notes', { id: 'n1', title: 'A', pinned: true });
    await a.insert('notes', { id: 'n2', title: 'B', pinned: false });
    await a.insert('notes', { id: 'n3', title: 'C', pinned: true });
    const out = await a.query('notes', {
      filters: [{ field: 'pinned', op: 'eq', value: true }],
      sort: [{ field: 'title', dir: 'desc' }],
    });
    expect(out.map((r) => r.id)).toEqual(['n3', 'n1']);
  });

  it('empty query returns all rows via applyQuery', async () => {
    const a = new IndexedDbAdapter('app');
    await a.ensureCollection('notes');
    await a.insert('notes', { id: 'n1', title: 'A' });
    await a.insert('notes', { id: 'n2', title: 'B' });
    const out = await a.query('notes', {});
    expect(out.map((r) => r.id).sort()).toEqual(['n1', 'n2']);
  });
});

describe('IndexedDbAdapter — versionchange / store creation', () => {
  it('all stores registered before first I/O => DB opens once, 0 reopens', async () => {
    const a = new IndexedDbAdapter('app');
    await a.ensureCollection('notes');
    await a.ensureCollection('tasks');
    // First I/O opens the DB exactly once at v1 with both stores buffered.
    await a.insert('notes', { id: 'n1', title: 'A' });
    await a.insert('tasks', { id: 't1', label: 'X' });
    expect(a.reopenCount).toBe(0);
    expect(await a.get('notes', 'n1')).toEqual({ id: 'n1', title: 'A' });
    expect(await a.get('tasks', 't1')).toEqual({ id: 't1', label: 'X' });
  });

  it('a store registered AFTER first I/O triggers exactly one reopen with no data loss', async () => {
    const a = new IndexedDbAdapter('app');
    await a.ensureCollection('notes');
    await a.insert('notes', { id: 'n1', title: 'A' }); // opens DB at v1
    expect(a.reopenCount).toBe(0);

    // Lazy/code-split registration after the DB is already open.
    await a.ensureCollection('tags');
    await a.insert('tags', { id: 'g1', name: 'red' }); // forces reopen at v2
    expect(a.reopenCount).toBe(1);

    // Pre-existing data survives the bump.
    expect(await a.get('notes', 'n1')).toEqual({ id: 'n1', title: 'A' });
    expect(await a.get('tags', 'g1')).toEqual({ id: 'g1', name: 'red' });
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage && npx vitest run test/IndexedDbAdapter.test.ts`
Expected: FAIL with "Failed to resolve import '../src/web.js'" (the adapter does not exist yet)
- [ ] **Step 3: Create `storage/src/web.ts` (complete code)**
```ts
import { openDB, type IDBPDatabase } from 'idb';
import {
  applyQuery,
  NotFoundError,
  StorageError,
  type DatabaseAdapter,
  type Id,
  type Query,
  type QueryFilter,
  type Row,
} from '@sublime-ui/framework';

const ID_KEY = 'id';

/**
 * Web DatabaseAdapter backed by IndexedDB via `idb`.
 *
 * Design (SP1 §7.3): one object store per resource, `keyPath: 'id'`, native
 * objects (no JSON column). Object stores can only be created inside a
 * `versionchange` upgrade, so we COLLECT-THEN-OPEN: `ensureCollection` buffers
 * resource names and the DB opens once at v1 with every buffered store. A
 * resource registered AFTER the DB is open (code-split) triggers a guarded
 * `reopenWithBump()` (close + reopen at v+1) — pre-existing stores/data survive
 * because `upgrade` only creates stores that are missing.
 *
 * Query: id-only `eq` filters push down to `store.get`; everything else falls
 * back to `getAll()` + the shared `applyQuery` (one operator-semantics oracle).
 */
export class IndexedDbAdapter implements DatabaseAdapter {
  private readonly stores = new Set<string>();
  private db: IDBPDatabase | null = null;
  private opening: Promise<IDBPDatabase> | null = null;
  /** Test/diagnostic counter: number of version-bump reopens performed. */
  reopenCount = 0;

  constructor(private readonly dbName = 'sublime') {}

  async ensureCollection(resource: string): Promise<void> {
    if (this.stores.has(resource)) return;
    this.stores.add(resource);
    // If the DB is already open and is missing this store, reopen at v+1 so the
    // new object store is created in a fresh versionchange.
    if (this.db && !this.db.objectStoreNames.contains(resource)) {
      await this.reopenWithBump();
    }
  }

  async get(resource: string, id: Id): Promise<Row | null> {
    const db = await this.open();
    const row = (await db.get(resource, String(id))) as Row | undefined;
    return row ?? null;
  }

  async getAll(resource: string): Promise<Row[]> {
    const db = await this.open();
    return (await db.getAll(resource)) as Row[];
  }

  async query(resource: string, query: Query): Promise<Row[]> {
    // Push down an id-only equality so a primary-key lookup avoids a full scan.
    const idEq = this.idOnlyEq(query);
    if (idEq !== undefined) {
      const row = await this.get(resource, idEq);
      return row ? [row] : [];
    }
    const all = await this.getAll(resource);
    return applyQuery(all, query);
  }

  async insert(resource: string, row: Row): Promise<Row> {
    const db = await this.open();
    try {
      await db.add(resource, row);
    } catch (e) {
      throw new StorageError(
        `Failed to insert into "${resource}" (duplicate id ${String(row[ID_KEY])}?)`,
        { cause: e },
      );
    }
    return { ...row };
  }

  async update(resource: string, id: Id, row: Row): Promise<Row> {
    const db = await this.open();
    const key = String(id);
    const current = (await db.get(resource, key)) as Row | undefined;
    if (current === undefined) {
      throw new NotFoundError(`${resource}#${key} not found`, { resource, id });
    }
    const merged: Row = { ...current, ...row, [ID_KEY]: current[ID_KEY] };
    await db.put(resource, merged);
    return { ...merged };
  }

  async delete(resource: string, id: Id): Promise<void> {
    const db = await this.open();
    // .delete is a no-op when the key is absent — satisfies "missing -> no-op".
    await db.delete(resource, String(id));
  }

  /** Returns the id value iff the query is a single `id eq <scalar>` filter. */
  private idOnlyEq(query: Query): Id | undefined {
    const filters = query.filters;
    if (!filters || filters.length !== 1) return undefined;
    if (query.sort || query.limit !== undefined || query.offset !== undefined) return undefined;
    const f: QueryFilter = filters[0]!;
    if (f.field !== ID_KEY || f.op !== 'eq') return undefined;
    const v = f.value;
    if (typeof v === 'string' || typeof v === 'number') return v;
    return undefined;
  }

  /** Open (or reuse) the DB, creating every buffered object store at v1. */
  private async open(): Promise<IDBPDatabase> {
    if (this.db) return this.db;
    if (this.opening) return this.opening;
    const wanted = [...this.stores];
    this.opening = openDB(this.dbName, 1, {
      upgrade: (db) => {
        for (const name of wanted) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: ID_KEY });
          }
        }
      },
      blocking: () => {
        // Another tab wants to upgrade — release our handle so it can proceed.
        this.db?.close();
        this.db = null;
      },
    }).then((db) => {
      this.db = db;
      this.opening = null;
      return db;
    });
    return this.opening;
  }

  /**
   * Close and reopen the DB at version+1 so a lazily-registered object store is
   * created in a fresh upgrade. Pre-existing stores survive (upgrade only
   * creates missing ones); existing data is untouched.
   */
  private async reopenWithBump(): Promise<void> {
    const current = this.db;
    if (!current) {
      // Nothing open yet — the next open() picks up the new store at v1.
      return;
    }
    const nextVersion = current.version + 1;
    const wanted = [...this.stores];
    current.close();
    this.db = null;
    this.reopenCount += 1;
    const db = await openDB(this.dbName, nextVersion, {
      upgrade: (d) => {
        for (const name of wanted) {
          if (!d.objectStoreNames.contains(name)) {
            d.createObjectStore(name, { keyPath: ID_KEY });
          }
        }
      },
      blocking: () => {
        this.db?.close();
        this.db = null;
      },
    });
    this.db = db;
  }
}

/** Factory mirroring the createDatabaseAdapter() resolver's call site (H4). */
export function createIndexedDbAdapter(dbName = 'sublime'): IndexedDbAdapter {
  return new IndexedDbAdapter(dbName);
}
```
- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage && npx vitest run test/IndexedDbAdapter.test.ts`
Expected: PASS (CRUD, query push-down + scan fallback, and both versionchange cases: 0 reopens when all-registered-first, 1 reopen with no data loss when lazy)
- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add storage/src/web.ts storage/test/IndexedDbAdapter.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "feat(storage): add IndexedDbAdapter (idb) with collect-then-open + reopen escape hatch"
```

---

### Task H3: SqliteDriver port + buildSelect + SqliteAdapter

**Files:**
- Create: `storage/src/sqlite/SqliteDriver.ts`
- Create: `storage/src/sqlite/buildSelect.ts`
- Create: `storage/src/sqlite/SqliteAdapter.ts`
- Test: `storage/test/buildSelect.test.ts`
- Test: `storage/test/SqliteAdapter.test.ts`

**Interfaces:**
- Consumes: from `@sublime-ui/framework` — `StorageError` (value), `NotFoundError` (value), and types `DatabaseAdapter`, `Row`, `Id`, `Query`, `QueryFilter`, `QuerySort`
- Produces: `interface SqliteDriver { exec(sql: string): Promise<void>; run(sql: string, params: unknown[]): Promise<{ changes: number }>; all(sql: string, params: unknown[]): Promise<{ doc: string }[]>; get(sql: string, params: unknown[]): Promise<{ doc: string } | undefined>; tx?<T>(fn: () => Promise<T>): Promise<T> }`; `function buildSelect(table: string, q: Query): { sql: string; params: unknown[] }`; `function ident(name: string): string`; `class SqliteAdapter implements DatabaseAdapter { constructor(driver: SqliteDriver) }`

- [ ] **Step 1a: Write the failing test for buildSelect**
```ts
// storage/test/buildSelect.test.ts
import { describe, it, expect } from 'vitest';
import { buildSelect, ident } from '../src/sqlite/buildSelect.js';
import type { Query } from '@sublime-ui/framework';

describe('ident', () => {
  it('accepts a valid table name', () => {
    expect(ident('notes')).toBe('"notes"');
    expect(ident('_x9')).toBe('"_x9"');
  });

  it('rejects an invalid table name', () => {
    expect(() => ident('notes; DROP TABLE x')).toThrow();
    expect(() => ident('1bad')).toThrow();
    expect(() => ident('has space')).toThrow();
    expect(() => ident('')).toThrow();
  });
});

describe('buildSelect', () => {
  it('selects all when the query is empty', () => {
    const { sql, params } = buildSelect('notes', {});
    expect(sql).toBe('SELECT doc FROM "notes"');
    expect(params).toEqual([]);
  });

  it('eq scalar -> json_extract(doc,?) = ?', () => {
    const q: Query = { filters: [{ field: 'tier', op: 'eq', value: 'gold' }] };
    const { sql, params } = buildSelect('notes', q);
    expect(sql).toBe("SELECT doc FROM \"notes\" WHERE json_extract(doc, ?) = ?");
    expect(params).toEqual(['$.tier', 'gold']);
  });

  it('eq null -> json_extract(doc,?) IS NULL (no value param)', () => {
    const q: Query = { filters: [{ field: 'score', op: 'eq', value: null }] };
    const { sql, params } = buildSelect('notes', q);
    expect(sql).toBe("SELECT doc FROM \"notes\" WHERE json_extract(doc, ?) IS NULL");
    expect(params).toEqual(['$.score']);
  });

  it('ne -> <>', () => {
    const q: Query = { filters: [{ field: 'tier', op: 'ne', value: 'gold' }] };
    const { sql, params } = buildSelect('notes', q);
    expect(sql).toBe("SELECT doc FROM \"notes\" WHERE json_extract(doc, ?) <> ?");
    expect(params).toEqual(['$.tier', 'gold']);
  });

  it('comparison ops -> >, >=, <, <=', () => {
    expect(buildSelect('t', { filters: [{ field: 's', op: 'gt', value: 1 }] }).sql).toContain('json_extract(doc, ?) > ?');
    expect(buildSelect('t', { filters: [{ field: 's', op: 'gte', value: 1 }] }).sql).toContain('json_extract(doc, ?) >= ?');
    expect(buildSelect('t', { filters: [{ field: 's', op: 'lt', value: 1 }] }).sql).toContain('json_extract(doc, ?) < ?');
    expect(buildSelect('t', { filters: [{ field: 's', op: 'lte', value: 1 }] }).sql).toContain('json_extract(doc, ?) <= ?');
  });

  it('in -> IN (?, ?) with one value param per element + the path', () => {
    const q: Query = { filters: [{ field: 'id', op: 'in', value: [2, 4] }] };
    const { sql, params } = buildSelect('notes', q);
    expect(sql).toBe("SELECT doc FROM \"notes\" WHERE json_extract(doc, ?) IN (?, ?)");
    expect(params).toEqual(['$.id', 2, 4]);
  });

  it('in with an empty array -> contradiction (IN ())-safe: matches nothing', () => {
    const q: Query = { filters: [{ field: 'id', op: 'in', value: [] }] };
    const { sql } = buildSelect('notes', q);
    expect(sql).toBe("SELECT doc FROM \"notes\" WHERE 0");
  });

  it('like -> LIKE ? ESCAPE with %term% and escaped wildcards', () => {
    const q: Query = { filters: [{ field: 'name', op: 'like', value: 'al' }] };
    const { sql, params } = buildSelect('notes', q);
    expect(sql).toBe("SELECT doc FROM \"notes\" WHERE json_extract(doc, ?) LIKE ? ESCAPE '\\'");
    expect(params).toEqual(['$.name', '%al%']);
  });

  it('like escapes raw % and _ in the term', () => {
    const q: Query = { filters: [{ field: 'name', op: 'like', value: '50%_x' }] };
    const { params } = buildSelect('notes', q);
    expect(params).toEqual(['$.name', '%50\\%\\_x%']);
  });

  it('ANDs multiple filters', () => {
    const q: Query = {
      filters: [
        { field: 'tier', op: 'eq', value: 'gold' },
        { field: 'score', op: 'gte', value: 20 },
      ],
    };
    const { sql, params } = buildSelect('notes', q);
    expect(sql).toBe(
      "SELECT doc FROM \"notes\" WHERE json_extract(doc, ?) = ? AND json_extract(doc, ?) >= ?",
    );
    expect(params).toEqual(['$.tier', 'gold', '$.score', 20]);
  });

  it('ORDER BY honours multi-key sort and direction', () => {
    const q: Query = {
      sort: [
        { field: 'score', dir: 'desc' },
        { field: 'name', dir: 'asc' },
      ],
    };
    const { sql, params } = buildSelect('notes', q);
    expect(sql).toBe(
      "SELECT doc FROM \"notes\" ORDER BY json_extract(doc, ?) DESC, json_extract(doc, ?) ASC",
    );
    expect(params).toEqual(['$.score', '$.name']);
  });

  it('appends LIMIT and OFFSET (bound params)', () => {
    const q: Query = { limit: 10, offset: 5 };
    const { sql, params } = buildSelect('notes', q);
    expect(sql).toBe("SELECT doc FROM \"notes\" LIMIT ? OFFSET ?");
    expect(params).toEqual([10, 5]);
  });

  it('rejects an injection in the table name', () => {
    expect(() => buildSelect('notes; DROP TABLE x', {})).toThrow();
  });
});
```
- [ ] **Step 1b: Run buildSelect test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage && npx vitest run test/buildSelect.test.ts`
Expected: FAIL with "Failed to resolve import '../src/sqlite/buildSelect.js'" (the module does not exist yet)
- [ ] **Step 1c: Create `storage/src/sqlite/buildSelect.ts` (complete code)**
```ts
import type { Query, QueryFilter, QuerySort } from '@sublime-ui/framework';

const TABLE_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Validate and quote a SQL identifier (table name). Field paths are passed as
 * BOUND parameters (`json_extract(doc, ?)`), so only the table name needs
 * identifier validation — anything outside `^[A-Za-z_][A-Za-z0-9_]*$` throws.
 */
export function ident(name: string): string {
  if (!TABLE_RE.test(name)) {
    throw new Error(`Invalid SQL identifier: ${JSON.stringify(name)}`);
  }
  return `"${name}"`;
}

/** `$.field` JSON path for json_extract — bound as a parameter (no injection). */
function jsonPath(field: string): string {
  return `$.${field}`;
}

/** Escape LIKE wildcards in a raw term, then wrap as a contains pattern. */
function likePattern(term: string): string {
  const escaped = term.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  return `%${escaped}%`;
}

/**
 * Build a parameterized SELECT over a `(id TEXT PRIMARY KEY, doc TEXT)` table.
 * (SP1 §6.1.) Each filter -> `json_extract(doc, ?) <op> ?` (eq null -> IS NULL;
 * in -> IN (?, …); like -> LIKE ? ESCAPE '\\' wrapping %term%); sort ->
 * ORDER BY json_extract(doc, ?) ASC|DESC; LIMIT/OFFSET as bound params. The
 * table name is validated via `ident`; every field path / value is bound.
 */
export function buildSelect(table: string, q: Query): { sql: string; params: unknown[] } {
  const parts: string[] = [`SELECT doc FROM ${ident(table)}`];
  const params: unknown[] = [];

  if (q.filters && q.filters.length > 0) {
    const clauses = q.filters.map((f) => filterClause(f, params));
    parts.push(`WHERE ${clauses.join(' AND ')}`);
  }

  if (q.sort && q.sort.length > 0) {
    const order = q.sort.map((s: QuerySort) => {
      params.push(jsonPath(s.field));
      return `json_extract(doc, ?) ${s.dir === 'desc' ? 'DESC' : 'ASC'}`;
    });
    parts.push(`ORDER BY ${order.join(', ')}`);
  }

  if (q.limit !== undefined) {
    parts.push('LIMIT ?');
    params.push(q.limit);
  }
  if (q.offset !== undefined) {
    parts.push('OFFSET ?');
    params.push(q.offset);
  }

  return { sql: parts.join(' '), params };
}

function filterClause(f: QueryFilter, params: unknown[]): string {
  if (f.op === 'eq' && f.value === null) {
    params.push(jsonPath(f.field));
    return 'json_extract(doc, ?) IS NULL';
  }
  if (f.op === 'in') {
    const values = Array.isArray(f.value) ? f.value : [];
    if (values.length === 0) return '0'; // IN () is invalid SQL; 0 matches nothing
    params.push(jsonPath(f.field));
    const placeholders = values.map((v) => {
      params.push(v);
      return '?';
    });
    return `json_extract(doc, ?) IN (${placeholders.join(', ')})`;
  }
  if (f.op === 'like') {
    params.push(jsonPath(f.field));
    params.push(likePattern(String(f.value)));
    return "json_extract(doc, ?) LIKE ? ESCAPE '\\'";
  }
  const sqlOp = OP_SQL[f.op];
  params.push(jsonPath(f.field));
  params.push(f.value);
  return `json_extract(doc, ?) ${sqlOp} ?`;
}

const OP_SQL: Record<'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte', string> = {
  eq: '=',
  ne: '<>',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
};
```
- [ ] **Step 1d: Run buildSelect test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage && npx vitest run test/buildSelect.test.ts`
Expected: PASS
- [ ] **Step 2: Write the failing test for SqliteAdapter (with an in-process better-sqlite3-backed SqliteDriver)**
```ts
// storage/test/SqliteAdapter.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { NotFoundError, StorageError } from '@sublime-ui/framework';
import { SqliteAdapter } from '../src/sqlite/SqliteAdapter.js';
import type { SqliteDriver } from '../src/sqlite/SqliteDriver.js';

/** A synchronous better-sqlite3 SqliteDriver, wrapped to satisfy the async port. */
function makeDriver(db: InstanceType<typeof Database>): SqliteDriver {
  return {
    exec: async (sql) => {
      db.exec(sql);
    },
    run: async (sql, params) => {
      const info = db.prepare(sql).run(...params);
      return { changes: info.changes };
    },
    all: async (sql, params) => db.prepare(sql).all(...params) as { doc: string }[],
    get: async (sql, params) => db.prepare(sql).get(...params) as { doc: string } | undefined,
  };
}

let adapter: SqliteAdapter;

beforeEach(() => {
  const db = new Database(':memory:');
  adapter = new SqliteAdapter(makeDriver(db));
});

describe('SqliteAdapter — CRUD', () => {
  it('ensureCollection creates the table; insert + get round-trip', async () => {
    await adapter.ensureCollection('notes');
    const created = await adapter.insert('notes', { id: 'n1', title: 'Hello', pinned: true });
    expect(created).toEqual({ id: 'n1', title: 'Hello', pinned: true });
    expect(await adapter.get('notes', 'n1')).toEqual({ id: 'n1', title: 'Hello', pinned: true });
  });

  it('get returns null for an absent id', async () => {
    await adapter.ensureCollection('notes');
    expect(await adapter.get('notes', 'missing')).toBeNull();
  });

  it('getAll returns every row (empty -> [])', async () => {
    await adapter.ensureCollection('notes');
    expect(await adapter.getAll('notes')).toEqual([]);
    await adapter.insert('notes', { id: 'n1', title: 'A' });
    await adapter.insert('notes', { id: 'n2', title: 'B' });
    expect((await adapter.getAll('notes')).map((r) => r.id).sort()).toEqual(['n1', 'n2']);
  });

  it('insert of a duplicate id throws StorageError', async () => {
    await adapter.ensureCollection('notes');
    await adapter.insert('notes', { id: 'n1', title: 'A' });
    await expect(adapter.insert('notes', { id: 'n1', title: 'dup' })).rejects.toBeInstanceOf(StorageError);
  });

  it('update merges and returns the row', async () => {
    await adapter.ensureCollection('notes');
    await adapter.insert('notes', { id: 'n1', title: 'A', pinned: false });
    const updated = await adapter.update('notes', 'n1', { title: 'A2', pinned: true });
    expect(updated).toEqual({ id: 'n1', title: 'A2', pinned: true });
    expect(await adapter.get('notes', 'n1')).toEqual({ id: 'n1', title: 'A2', pinned: true });
  });

  it('update of a missing id throws NotFoundError (changes === 0)', async () => {
    await adapter.ensureCollection('notes');
    await expect(adapter.update('notes', 'nope', { title: 'x' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('delete removes a row; delete of a missing id is a no-op', async () => {
    await adapter.ensureCollection('notes');
    await adapter.insert('notes', { id: 'n1', title: 'A' });
    await adapter.delete('notes', 'n1');
    expect(await adapter.get('notes', 'n1')).toBeNull();
    await expect(adapter.delete('notes', 'n1')).resolves.toBeUndefined();
  });
});

describe('SqliteAdapter — query (buildSelect)', () => {
  beforeEach(async () => {
    await adapter.ensureCollection('notes');
    await adapter.insert('notes', { id: 'n1', title: 'Alpha', score: 30, tier: 'gold' });
    await adapter.insert('notes', { id: 'n2', title: 'beta', score: 10, tier: 'silver' });
    await adapter.insert('notes', { id: 'n3', title: 'Gamma', score: 20, tier: 'gold' });
  });

  it('eq filter', async () => {
    const out = await adapter.query('notes', { filters: [{ field: 'tier', op: 'eq', value: 'gold' }] });
    expect(out.map((r) => r.id).sort()).toEqual(['n1', 'n3']);
  });

  it('gte + sort + limit', async () => {
    const out = await adapter.query('notes', {
      filters: [{ field: 'score', op: 'gte', value: 20 }],
      sort: [{ field: 'score', dir: 'desc' }],
      limit: 1,
    });
    expect(out.map((r) => r.id)).toEqual(['n1']);
  });

  it('in filter', async () => {
    const out = await adapter.query('notes', { filters: [{ field: 'id', op: 'in', value: ['n1', 'n3'] }] });
    expect(out.map((r) => r.id).sort()).toEqual(['n1', 'n3']);
  });

  it('like is case-insensitive contains', async () => {
    const out = await adapter.query('notes', { filters: [{ field: 'title', op: 'like', value: 'a' }] });
    // Alpha, beta, Gamma all contain 'a' case-insensitively.
    expect(out.map((r) => r.id).sort()).toEqual(['n1', 'n2', 'n3']);
  });

  it('empty query returns all', async () => {
    const out = await adapter.query('notes', {});
    expect(out.map((r) => r.id).sort()).toEqual(['n1', 'n2', 'n3']);
  });
});

describe('SqliteAdapter — safety', () => {
  it('rejects an injection in the resource/table name', async () => {
    await expect(adapter.ensureCollection('notes; DROP TABLE x')).rejects.toThrow();
  });
});

describe('SqliteAdapter — JSON1 probe', () => {
  it('throws StorageError on first use when json_extract is unavailable', async () => {
    const noJson: SqliteDriver = {
      exec: async () => {},
      run: async () => ({ changes: 0 }),
      all: async () => [],
      // Simulate a build without JSON1: the probe SELECT fails.
      get: async (sql) => {
        if (sql.includes("json_extract('{\"a\":1}'")) {
          throw new Error('no such function: json_extract');
        }
        return undefined;
      },
    };
    const a = new SqliteAdapter(noJson);
    await expect(a.ensureCollection('notes')).rejects.toBeInstanceOf(StorageError);
  });
});
```
- [ ] **Step 3a: Create `storage/src/sqlite/SqliteDriver.ts` (the port)**
```ts
/**
 * Minimal SQL execution port the SqliteAdapter delegates to (SP1 §7.2). Each
 * per-platform driver (desktop better-sqlite3 over IPC; mobile expo-sqlite)
 * implements this — there is NO per-platform adapter subclass.
 *
 * `run` returns `changes` so update-of-missing can be detected (changes === 0).
 * `all`/`get` return rows shaped `{ doc }` because the storage table is
 * `(id TEXT PRIMARY KEY, doc TEXT)` and selects project only `doc`.
 */
export interface SqliteDriver {
  exec(sql: string): Promise<void>;
  run(sql: string, params: unknown[]): Promise<{ changes: number }>;
  all(sql: string, params: unknown[]): Promise<{ doc: string }[]>;
  get(sql: string, params: unknown[]): Promise<{ doc: string } | undefined>;
  /** Optional real transaction (mobile/expo provides it; desktop defers — SP1 §11). */
  tx?<T>(fn: () => Promise<T>): Promise<T>;
}
```
- [ ] **Step 3b: Create `storage/src/sqlite/SqliteAdapter.ts` (complete code)**
```ts
import {
  NotFoundError,
  StorageError,
  type DatabaseAdapter,
  type Id,
  type Query,
  type Row,
} from '@sublime-ui/framework';
import { buildSelect, ident } from './buildSelect.js';
import type { SqliteDriver } from './SqliteDriver.js';

const ID_KEY = 'id';

/**
 * One platform-agnostic DatabaseAdapter over a `SqliteDriver` (SP1 §7.2).
 * Document storage: `CREATE TABLE IF NOT EXISTS "<resource>" (id TEXT PRIMARY
 * KEY, doc TEXT NOT NULL)`. The PK is the `id` JSON field stringified; queries
 * go through `buildSelect` (json_extract). On first use it runs a JSON1
 * capability probe and throws StorageError if absent. Table names are validated
 * via `ident`; field paths/values are bound (no injection).
 */
export class SqliteAdapter implements DatabaseAdapter {
  private readonly created = new Set<string>();
  private probed = false;

  constructor(private readonly driver: SqliteDriver) {}

  async ensureCollection(resource: string): Promise<void> {
    if (this.created.has(resource)) return;
    await this.probeJson1();
    const table = ident(resource); // throws on an invalid name
    await this.driver.exec(
      `CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, doc TEXT NOT NULL)`,
    );
    this.created.add(resource);
  }

  async get(resource: string, id: Id): Promise<Row | null> {
    const table = ident(resource);
    const row = await this.driver.get(`SELECT doc FROM ${table} WHERE id = ?`, [String(id)]);
    return row ? (JSON.parse(row.doc) as Row) : null;
  }

  async getAll(resource: string): Promise<Row[]> {
    const table = ident(resource);
    const rows = await this.driver.all(`SELECT doc FROM ${table}`, []);
    return rows.map((r) => JSON.parse(r.doc) as Row);
  }

  async query(resource: string, query: Query): Promise<Row[]> {
    const { sql, params } = buildSelect(resource, query);
    const rows = await this.driver.all(sql, params);
    return rows.map((r) => JSON.parse(r.doc) as Row);
  }

  async insert(resource: string, row: Row): Promise<Row> {
    const table = ident(resource);
    const id = String(row[ID_KEY]);
    try {
      await this.driver.run(`INSERT INTO ${table} (id, doc) VALUES (?, ?)`, [
        id,
        JSON.stringify(row),
      ]);
    } catch (e) {
      throw new StorageError(`Failed to insert into "${resource}" (duplicate id ${id}?)`, {
        cause: e,
      });
    }
    return { ...row };
  }

  async update(resource: string, id: Id, row: Row): Promise<Row> {
    const current = await this.get(resource, id);
    if (current === null) {
      throw new NotFoundError(`${resource}#${String(id)} not found`, { resource, id });
    }
    const merged: Row = { ...current, ...row, [ID_KEY]: current[ID_KEY] };
    const table = ident(resource);
    const info = await this.driver.run(`UPDATE ${table} SET doc = ? WHERE id = ?`, [
      JSON.stringify(merged),
      String(id),
    ]);
    if (info.changes === 0) {
      throw new NotFoundError(`${resource}#${String(id)} not found`, { resource, id });
    }
    return { ...merged };
  }

  async delete(resource: string, id: Id): Promise<void> {
    const table = ident(resource);
    // No-op when the row is absent (changes === 0 is fine).
    await this.driver.run(`DELETE FROM ${table} WHERE id = ?`, [String(id)]);
  }

  /** One-time JSON1 capability probe (SP1 §7.2): SELECT json_extract('{"a":1}','$.a'). */
  private async probeJson1(): Promise<void> {
    if (this.probed) return;
    try {
      await this.driver.get("SELECT json_extract('{\"a\":1}', '$.a') AS v", []);
    } catch (e) {
      throw new StorageError('SQLite JSON1 extension is unavailable (json_extract failed)', {
        cause: e,
      });
    }
    this.probed = true;
  }
}
```
- [ ] **Step 3c: Run the SqliteAdapter test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage && npx vitest run test/SqliteAdapter.test.ts`
Expected: PASS (CRUD, query via buildSelect, update-missing -> NotFoundError, duplicate -> StorageError, ident rejection, JSON1 probe -> StorageError)
- [ ] **Step 4: Run both new SQLite tests together, verify they pass**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage && npx vitest run test/buildSelect.test.ts test/SqliteAdapter.test.ts`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add storage/src/sqlite/SqliteDriver.ts storage/src/sqlite/buildSelect.ts storage/src/sqlite/SqliteAdapter.ts storage/test/buildSelect.test.ts storage/test/SqliteAdapter.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "feat(storage): add SqliteDriver port, buildSelect, and SqliteAdapter (JSON1 probe, ident safety)"
```

---

### Task H4: Platform entries (mobile/desktop), createDatabaseAdapter() resolver, and the barrel

**Files:**
- Create: `storage/src/mobile.ts`
- Create: `storage/src/createDatabaseAdapter.web.ts` (web-only here; the desktop branch is added in I2)
- Create: `storage/src/createDatabaseAdapter.native.ts`
- Modify: `storage/src/index.ts` (replace the H1 placeholder with the real barrel)
- Test: `storage/test/createDatabaseAdapter.test.ts`

> **Single-owner note (cross-phase):** `storage/src/desktop.ts` is authored ONLY
> in Task I2 (it imports `@sublime-ui/desktop/client` `getNative`). H4 does NOT
> create `desktop.ts` and does NOT export `createDesktopSqliteAdapter` from the
> barrel; I2 adds both when it lands, so every commit stays green. The
> `src/desktop.ts` tsup entry (declared in H1's `tsup.config.ts`) is filled by I2.

**Interfaces:**
- Consumes: from `@sublime-ui/framework` — type `DatabaseAdapter`; from `./sqlite/SqliteAdapter.js` — `SqliteAdapter`; from `./sqlite/SqliteDriver.js` — type `SqliteDriver`; from `./web.js` — `IndexedDbAdapter`
- Produces: `function createDatabaseAdapter(): DatabaseAdapter` (re-exported from `./createDatabaseAdapter.web.ts` by the bundler's web condition and `./createDatabaseAdapter.native.ts` by the native condition; in H4 the web entry is web-only — IndexedDB — and the desktop branch is added in I2); `function createExpoSqliteAdapter(databaseName?: string): Promise<DatabaseAdapter>` (mobile); the `@sublime-ui/storage` barrel re-exporting `SqliteAdapter`, `IndexedDbAdapter`, `buildSelect`, `ident`, `type SqliteDriver`, and `createDatabaseAdapter` (NOT `createDesktopSqliteAdapter` — that is added by I2 when it authors `desktop.ts`)

> **Platform-resolution mechanism (verified against `ui/src/navigation`):** the UI
> package resolves a platform implementation via the `.web.ts` / `.native.ts`
> file-name convention so the bundler (Metro for native, the web bundler for
> web) picks the right file. `ui/src/navigation/bridge.web.ts` exports
> `useWebNav` and `bridge.native.ts` exports `useNativeNav`; consumers import the
> bare `./bridge` and the bundler condition selects the file. We mirror that:
> `createDatabaseAdapter.web.ts` (web/desktop) and
> `createDatabaseAdapter.native.ts` (Metro -> expo). In H4 the web entry is
> web-only (returns `IndexedDbAdapter`); I2 adds the runtime desktop-bridge
> detection (via `getNative('sqlite')`) to the SAME web file. `storage/src/index.ts`
> re-exports `createDatabaseAdapter` from the bare `./createDatabaseAdapter.js`
> specifier; the `package.json` `exports`/bundler condition picks `.web`/`.native`.
> Both concrete files are also listed as `tsup` entries (H1 `tsup.config.ts`) so
> each emits its own `dist` file.

- [ ] **Step 1: Write the failing test** — H4's web entry is web-only, so it asserts the no-bridge case (→ IndexedDb). I2 EXTENDS this file with the bridge-present case (→ desktop SQLite) using the real `{ invoke }` bridge shape that `getNative` reads.
```ts
// storage/test/createDatabaseAdapter.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IndexedDbAdapter } from '../src/web.js';
import { createDatabaseAdapter } from '../src/createDatabaseAdapter.web.js';

// The desktop bridge `getNative` reads is `globalThis.sublimeNative = { invoke }`
// (the ONE real IPC channel — see desktop/src/get-native.ts). H4's web entry is
// web-only, so this file only asserts the no-bridge case here; I2 adds the
// bridge-present (→ SQLite) case using `globalThis.sublimeNative = { invoke }`.
type NativeBridge = {
  sublimeNative?: { invoke: (mod: string, method: string, args: unknown[]) => Promise<unknown> };
};

afterEach(() => {
  delete (globalThis as NativeBridge).sublimeNative;
});

describe('createDatabaseAdapter (web resolution)', () => {
  beforeEach(() => {
    delete (globalThis as NativeBridge).sublimeNative;
  });

  it('returns an IndexedDbAdapter when no desktop native bridge is present', () => {
    const adapter = createDatabaseAdapter();
    expect(adapter).toBeInstanceOf(IndexedDbAdapter);
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage && npx vitest run test/createDatabaseAdapter.test.ts`
Expected: FAIL with "Failed to resolve import '../src/createDatabaseAdapter.web.js'" (the resolver does not exist yet)
- [ ] **Step 3a: Create `storage/src/createDatabaseAdapter.web.ts` (complete code)** — web condition; web-only here (IndexedDB). The desktop-bridge branch is added in I2.
```ts
import type { DatabaseAdapter } from '@sublime-ui/framework';
import { IndexedDbAdapter } from './web.js';

/**
 * Web-condition resolver (SP1 §6.5). The web bundle ships IndexedDB. Desktop
 * runs the SAME web bundle inside Electron, so Task I2 adds a RUNTIME probe here
 * for the desktop native bridge via `getNative('sqlite')` from
 * `@sublime-ui/desktop/client` (which works over `globalThis.sublimeNative.invoke`
 * — the one real IPC channel). When that proxy is available, I2 returns the
 * desktop SQLite-over-IPC adapter; otherwise this plain-web entry returns
 * IndexedDB. Native deps never enter the web bundle.
 */
export function createDatabaseAdapter(): DatabaseAdapter {
  // Desktop branch added in I2 (getNative('sqlite') -> createDesktopSqliteAdapter()).
  return new IndexedDbAdapter();
}
```
- [ ] **Step 3b: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage && npx vitest run test/createDatabaseAdapter.test.ts`
Expected: PASS (no bridge -> IndexedDbAdapter; bridge with `sqlite` -> SqliteAdapter)
- [ ] **Step 3c: Create `storage/src/createDatabaseAdapter.native.ts` (complete code)** — Metro picks this; expo-sqlite driver -> SqliteAdapter
```ts
import type { DatabaseAdapter } from '@sublime-ui/framework';
import { createExpoSqliteAdapter } from './mobile.js';

/**
 * Native-condition resolver (SP1 §6.5). Metro selects this file via the
 * `.native.ts` convention. `createDatabaseAdapter()` returns synchronously to
 * match the web signature, so the underlying expo database is opened lazily on
 * first I/O: we hand back a thin DatabaseAdapter that awaits a one-time
 * `createExpoSqliteAdapter()` and delegates every call to it.
 */
export function createDatabaseAdapter(): DatabaseAdapter {
  let inner: Promise<DatabaseAdapter> | null = null;
  const get = (): Promise<DatabaseAdapter> => (inner ??= createExpoSqliteAdapter());
  return {
    ensureCollection: async (r) => (await get()).ensureCollection(r),
    get: async (r, id) => (await get()).get(r, id),
    getAll: async (r) => (await get()).getAll(r),
    query: async (r, q) => (await get()).query(r, q),
    insert: async (r, row) => (await get()).insert(r, row),
    update: async (r, id, row) => (await get()).update(r, id, row),
    delete: async (r, id) => (await get()).delete(r, id),
  };
}
```
- [ ] **Step 3d: Create `storage/src/mobile.ts` (complete code)** — expo-sqlite driver -> SqliteAdapter
```ts
import type { DatabaseAdapter } from '@sublime-ui/framework';
import { SqliteAdapter } from './sqlite/SqliteAdapter.js';
import type { SqliteDriver } from './sqlite/SqliteDriver.js';

/**
 * Minimal subset of the expo-sqlite async API we depend on (SP1 §7.2). Declared
 * locally so `@sublime-ui/storage` does not need expo's types in CI; the real
 * module satisfies this shape (`openDatabaseAsync`/`runAsync`/`getAllAsync`/
 * `getFirstAsync`/`withTransactionAsync`).
 */
interface ExpoDatabase {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params: unknown[]): Promise<{ changes: number }>;
  getAllAsync(sql: string, params: unknown[]): Promise<{ doc: string }[]>;
  getFirstAsync(sql: string, params: unknown[]): Promise<{ doc: string } | null>;
  withTransactionAsync(fn: () => Promise<void>): Promise<void>;
}
interface ExpoSqliteModule {
  openDatabaseAsync(name: string): Promise<ExpoDatabase>;
}

/** Adapt an opened expo database to the SqliteDriver port. */
function expoDriver(db: ExpoDatabase): SqliteDriver {
  return {
    exec: (sql) => db.execAsync(sql),
    run: (sql, params) => db.runAsync(sql, params),
    all: (sql, params) => db.getAllAsync(sql, params),
    get: async (sql, params) => (await db.getFirstAsync(sql, params)) ?? undefined,
    tx: async <T>(fn: () => Promise<T>): Promise<T> => {
      let result!: T;
      await db.withTransactionAsync(async () => {
        result = await fn();
      });
      return result;
    },
  };
}

/**
 * Open an expo-sqlite database and wrap it in a SqliteAdapter. `expo-sqlite` is
 * an optional peer dependency imported dynamically so it never resolves outside
 * a React Native bundle.
 */
export async function createExpoSqliteAdapter(databaseName = 'sublime.db'): Promise<DatabaseAdapter> {
  const mod = (await import('expo-sqlite')) as unknown as ExpoSqliteModule;
  const db = await mod.openDatabaseAsync(databaseName);
  return new SqliteAdapter(expoDriver(db));
}
```
> **`storage/src/desktop.ts` is NOT authored here** — Task I2 creates it (it
> imports `@sublime-ui/desktop/client` `getNative` and the type-only
> `SqliteContract`, adapts the `getNative('sqlite')` proxy to the SqliteDriver
> port, and exports `createDesktopSqliteAdapter(): SqliteAdapter`). I2 also adds
> `export { createDesktopSqliteAdapter } from './desktop.js';` to the barrel below.
- [ ] **Step 3f: Replace `storage/src/index.ts` (the H1 placeholder) with the real barrel**
```ts
/**
 * @sublime-ui/storage — platform DatabaseAdapter implementations.
 *
 * The default entry ('.') re-exports the pure pieces (SqliteAdapter, the driver
 * port, buildSelect/ident, IndexedDbAdapter) plus the platform-resolved
 * `createDatabaseAdapter()`. The bundler selects `createDatabaseAdapter.web.ts`
 * or `.native.ts` for the bare `./createDatabaseAdapter.js` specifier via the
 * file-name convention (mirrors @sublime-ui/ui's navigation bridge). Per-engine
 * subpaths are also exposed: './web', './desktop', './mobile'.
 */
export { SqliteAdapter } from './sqlite/SqliteAdapter.js';
export { buildSelect, ident } from './sqlite/buildSelect.js';
export type { SqliteDriver } from './sqlite/SqliteDriver.js';
export { IndexedDbAdapter, createIndexedDbAdapter } from './web.js';
export { createExpoSqliteAdapter } from './mobile.js';
export { createDatabaseAdapter } from './createDatabaseAdapter.web.js';
// NOTE: `createDesktopSqliteAdapter` is NOT exported here — `./desktop.js` does
// not exist until Task I2, which adds
// `export { createDesktopSqliteAdapter } from './desktop.js';` to this barrel.
```
- [ ] **Step 3g: Typecheck the storage package** so the new entries + barrel compile under strict TS
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage && npx tsc --noEmit`
Expected: PASS (no type errors)
- [ ] **Step 4: Run the full storage test suite, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage && npx vitest run`
Expected: PASS (setup.smoke, IndexedDbAdapter, buildSelect, SqliteAdapter, createDatabaseAdapter)
- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add storage/src/mobile.ts storage/src/createDatabaseAdapter.web.ts storage/src/createDatabaseAdapter.native.ts storage/src/index.ts storage/test/createDatabaseAdapter.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "feat(storage): add platform entries + createDatabaseAdapter() resolver and package barrel"
```


### Task I1: getNative accessor + built-in `sqlite` native service (@sublime-ui/desktop)

**Files:**
- Create: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop/src/get-native.ts`
- Create: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop/src/services/sqlite.ts`
- Create: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop/src/services/get-better-sqlite3.ts`
- Modify: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop/src/use-native.ts:13-57`
- Modify: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop/src/client.ts:31-33`
- Modify: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop/src/index.ts:30-32,60-68`
- Modify: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop/src/services/index.ts:9-13`
- Modify: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop/package.json:25-39` (peerDependencies + add `./sqlite` export + sqlite-contract export)
- Test: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop/test/get-native.test.ts`
- Test: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop/test/services/sqlite.test.ts`
- Test (existing, extended): `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop/test/client-bundle-safety.test.ts:73-85`

**Interfaces:**
- Consumes: `createProxy<M>(mod, invoke)` (from `bridge/proxy.js`), `deserializeError(serialized)` + `SerializedError` (from `errors.js`), `NativeMethods` (from `types.js`), `defineNative(name, methods)` (from `define-native.js`).
- Produces:
  - `getNative<M extends NativeMethods>(name: string): M | null` — hook-free renderer accessor (returns the same typed proxy `useNative` returns, or `null` off-bridge). Exported from `./client` and the main barrel.
  - `sqlite` — a `NativeService` authored with `defineNative('sqlite', {...})`, main-only `better-sqlite3`, methods `exec(sql)`, `run(sql, params)`, `all(sql, params)`, `get(sql, params)`. Registerable via `registerNative([sqlite])`.
  - `SqliteContract` — a renderer-safe, type-only contract type (`typeof sqlite.methods`) exported from `@sublime-ui/desktop/sqlite-contract` (and re-exported as a `type` from the main barrel) so the renderer/storage driver can `import type` it without crossing into node/better-sqlite3.

- [ ] **Step 1: Write the failing test** — `getNative` proxy/null behaviour
```ts
// desktop/test/get-native.test.ts
import { afterEach, describe, it, expect, vi } from 'vitest';
import { getNative } from '../src/get-native';
import { NativeError, serializeError } from '../src/errors';

type Fs = {
  readFile: (path: string) => Promise<string>;
};

afterEach(() => {
  delete (globalThis as unknown as { sublimeNative?: unknown }).sublimeNative;
});

describe('getNative (hook-free)', () => {
  it('returns null on plain web (no globalThis.sublimeNative)', () => {
    expect(getNative<Fs>('fs')).toBeNull();
  });

  it('forwards calls through the bridge invoke', async () => {
    const invoke = vi.fn().mockResolvedValue('contents');
    (globalThis as unknown as { sublimeNative: { invoke: typeof invoke } }).sublimeNative = {
      invoke,
    };

    const proxy = getNative<Fs>('fs');
    expect(proxy).not.toBeNull();
    await expect(proxy!.readFile('/a.txt')).resolves.toBe('contents');
    expect(invoke).toHaveBeenCalledWith('fs', 'readFile', ['/a.txt']);
  });

  it('rethrows a {__nativeError} envelope as a NativeError', async () => {
    const envelope = {
      __nativeError: serializeError(
        Object.assign(new Error('boom'), { code: 'ENOENT' }),
      ),
    };
    const invoke = vi.fn().mockResolvedValue(envelope);
    (globalThis as unknown as { sublimeNative: { invoke: typeof invoke } }).sublimeNative = {
      invoke,
    };

    const proxy = getNative<Fs>('fs');
    await expect(proxy!.readFile('/missing.txt')).rejects.toBeInstanceOf(NativeError);
    await expect(proxy!.readFile('/missing.txt')).rejects.toMatchObject({
      message: 'boom',
      code: 'ENOENT',
    });
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop && npx vitest run test/get-native.test.ts`
Expected: FAIL — `Failed to resolve import "../src/get-native"` (the module does not exist yet).

- [ ] **Step 3: Create `get-native.ts`, refactor `use-native.ts` onto it, export it**

Create `desktop/src/get-native.ts` (the hook-free body factored out of `useNative`; pure — no node/electron, safe for `./client`):
```ts
// desktop/src/get-native.ts
/**
 * Hook-free accessor for a native service.
 *
 * The non-React twin of {@link useNative}: it reads the same
 * `globalThis.sublimeNative` bridge exposed by the preload and returns the same
 * typed {@link createProxy}, or `null` on plain web where no bridge ran. Use it
 * outside React — e.g. the `@sublime-ui/storage` desktop SQLite driver adapts
 * `getNative('sqlite')` to its driver port. `useNative` delegates here so the
 * proxy/error-revival semantics are defined in exactly one place.
 */

import { createProxy } from './bridge/proxy.js';
import { deserializeError } from './errors.js';
import type { SerializedError } from './errors.js';
import type { NativeMethods } from './types.js';

/** Shape of the bridge exposed at `globalThis.sublimeNative` by the preload. */
interface SublimeNativeWindow {
  invoke(mod: string, method: string, args: unknown[]): Promise<unknown>;
}

/** Envelope shape returned by the main router when a native call fails. */
interface NativeErrorEnvelope {
  __nativeError: SerializedError;
}

function isNativeErrorEnvelope(value: unknown): value is NativeErrorEnvelope {
  return typeof value === 'object' && value !== null && '__nativeError' in value;
}

/**
 * Access a native service by name without a React hook.
 *
 * @typeParam M the service's method map (from the `defineNative` author).
 * @param name  the registry key of the native service (e.g. `'sqlite'`).
 * @returns a typed proxy, or `null` when running outside the Electron shell.
 */
export function getNative<M extends NativeMethods>(name: string): M | null {
  const bridge = (globalThis as { sublimeNative?: SublimeNativeWindow }).sublimeNative;
  if (bridge === undefined) {
    return null;
  }
  return createProxy<M>(name, async (mod, method, args) => {
    const result = await bridge.invoke(mod, method, args);
    if (isNativeErrorEnvelope(result)) {
      throw deserializeError(result.__nativeError);
    }
    return result;
  });
}
```

Rewrite `desktop/src/use-native.ts` so it delegates to `getNative` (replace lines 13-57 of the existing file — keep the file's leading doc comment lines 1-11):
```ts
// desktop/src/use-native.ts  (replace body below the leading doc comment)
import { getNative } from './get-native.js';
import type { NativeMethods } from './types.js';

/**
 * Access a native service by name from the renderer.
 *
 * Thin React-facing wrapper over {@link getNative}: it returns the same typed
 * proxy (or `null` outside the Electron shell). The proxy is created on every
 * render but is cheap and stateless, so callers can use it directly.
 *
 * @typeParam M the service's method map (from the `defineNative` author).
 * @param name  the registry key of the native service (e.g. `'fs'`).
 * @returns a typed proxy, or `null` when running outside the Electron shell.
 */
export function useNative<M extends NativeMethods>(name: string): M | null {
  return getNative<M>(name);
}
```

Add `getNative` to `desktop/src/client.ts` (after line 32, alongside `useNative`):
```ts
// desktop/src/client.ts  (renderer hook + proxy block)
export { useNative } from './use-native.js';
export { getNative } from './get-native.js';
export { createProxy } from './bridge/proxy.js';
```

Add `getNative` to the renderer-hook block of `desktop/src/index.ts` (lines 30-32):
```ts
// desktop/src/index.ts
// Renderer hook + proxy.
export { useNative } from './use-native.js';
export { getNative } from './get-native.js';
export { createProxy } from './bridge/proxy.js';
```

- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop && npx vitest run test/get-native.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing test** — `sqlite` service drives better-sqlite3
```ts
// desktop/test/services/sqlite.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Fakes for the better-sqlite3 statement + database the service drives.
const stmtRun = vi.fn();
const stmtAll = vi.fn();
const stmtGet = vi.fn();
const dbPrepare = vi.fn(() => ({ run: stmtRun, all: stmtAll, get: stmtGet }));
const dbExec = vi.fn();
const DatabaseCtor = vi.fn(() => ({ prepare: dbPrepare, exec: dbExec }));

vi.mock('better-sqlite3', () => ({ default: DatabaseCtor }));

// Resolve the DB path off the app userData dir without pulling electron at eval.
const getPath = vi.fn(() => '/tmp/userdata');
vi.mock('electron', () => ({ app: { getPath } }));

import { sqlite } from '../../src/services/sqlite';

beforeEach(() => {
  vi.clearAllMocks();
  stmtAll.mockReturnValue([]);
  stmtGet.mockReturnValue(undefined);
  stmtRun.mockReturnValue({ changes: 0 });
});

describe('sqlite service', () => {
  it('is a native service named "sqlite"', () => {
    expect(sqlite.name).toBe('sqlite');
  });

  it('exec forwards the SQL to better-sqlite3 exec', async () => {
    await sqlite.methods.exec('CREATE TABLE "t" (id TEXT PRIMARY KEY, doc TEXT NOT NULL)');
    expect(dbExec).toHaveBeenCalledWith(
      'CREATE TABLE "t" (id TEXT PRIMARY KEY, doc TEXT NOT NULL)',
    );
  });

  it('run prepares + executes with params and returns { changes }', async () => {
    stmtRun.mockReturnValue({ changes: 1, lastInsertRowid: 0 });
    const res = await sqlite.methods.run('INSERT INTO "t"(id,doc) VALUES(?,?)', ['1', '{}']);
    expect(dbPrepare).toHaveBeenCalledWith('INSERT INTO "t"(id,doc) VALUES(?,?)');
    expect(stmtRun).toHaveBeenCalledWith('1', '{}');
    expect(res).toEqual({ changes: 1 });
  });

  it('all returns the rows from the prepared statement', async () => {
    stmtAll.mockReturnValue([{ doc: '{"a":1}' }, { doc: '{"a":2}' }]);
    const rows = await sqlite.methods.all('SELECT doc FROM "t"', []);
    expect(stmtAll).toHaveBeenCalledWith();
    expect(rows).toEqual([{ doc: '{"a":1}' }, { doc: '{"a":2}' }]);
  });

  it('get returns the first row or undefined', async () => {
    stmtGet.mockReturnValue({ doc: '{"a":1}' });
    await expect(sqlite.methods.get('SELECT doc FROM "t" WHERE id=?', ['1'])).resolves.toEqual({
      doc: '{"a":1}',
    });
    stmtGet.mockReturnValue(undefined);
    await expect(sqlite.methods.get('SELECT doc FROM "t" WHERE id=?', ['9'])).resolves.toBeUndefined();
  });

  it('opens the database lazily (once) under the app userData dir', async () => {
    await sqlite.methods.exec('SELECT 1');
    await sqlite.methods.all('SELECT 1', []);
    expect(DatabaseCtor).toHaveBeenCalledTimes(1);
    expect(getPath).toHaveBeenCalledWith('userData');
  });
});
```
- [ ] **Step 6: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop && npx vitest run test/services/sqlite.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/services/sqlite"` (the service does not exist yet).

- [ ] **Step 7: Create the lazy better-sqlite3 seam + the `sqlite` service + contract type**

Create `desktop/src/services/get-better-sqlite3.ts` (mirrors `get-electron.ts`: keeps the native import out of module-eval time and gives tests one `vi.mock('better-sqlite3', …)` seam):
```ts
// desktop/src/services/get-better-sqlite3.ts
import type DatabaseConstructor from 'better-sqlite3';

/**
 * Lazy, mockable accessor for the optional `better-sqlite3` native module.
 *
 * `better-sqlite3` is a main-process-only native addon and an OPTIONAL peer
 * dependency: importing it at module-eval time would break environments that
 * don't ship it (and would taint any bundle that reaches this file). Going
 * through this single dynamic-import indirection keeps it lazy and gives unit
 * tests one seam to mock via `vi.mock('better-sqlite3', …)`.
 */
export async function getBetterSqlite3(): Promise<typeof DatabaseConstructor> {
  const mod = await import('better-sqlite3');
  return (mod as { default: typeof DatabaseConstructor }).default;
}
```

Create `desktop/src/services/sqlite.ts` (main-only; the `SqliteContract` type is the renderer-safe contract):
```ts
// desktop/src/services/sqlite.ts
import { join } from 'node:path';
import { defineNative } from '../define-native.js';
import { getElectron } from './get-electron.js';
import { getBetterSqlite3 } from './get-better-sqlite3.js';
import type DatabaseInstance from 'better-sqlite3';

/**
 * Built-in `sqlite` native service (main process only).
 *
 * A minimal synchronous-SQLite façade over `better-sqlite3`, exposed through the
 * native bridge so the renderer (and the `@sublime-ui/storage` desktop driver)
 * can drive a real on-disk database over the single `native:invoke` channel
 * without any native module entering the web bundle. The database lives at
 * `<userData>/sublime.db` and is opened lazily, once.
 *
 * `better-sqlite3` is an OPTIONAL peer dependency: an app only needs it when it
 * registers this service. The renderer-facing contract is the type-only
 * {@link SqliteContract}.
 */

let dbPromise: Promise<DatabaseInstance.Database> | undefined;

async function db(): Promise<DatabaseInstance.Database> {
  if (dbPromise === undefined) {
    dbPromise = (async () => {
      const electron = await getElectron();
      const Database = await getBetterSqlite3();
      const file = join(electron.app.getPath('userData'), 'sublime.db');
      return new Database(file);
    })();
  }
  return dbPromise;
}

export const sqlite = defineNative('sqlite', {
  /** Run a parameter-free statement (DDL / PRAGMA). */
  exec: async (sql: string): Promise<void> => {
    (await db()).exec(sql);
  },
  /** Run a write statement with bound params; returns the affected row count. */
  run: async (sql: string, params: unknown[]): Promise<{ changes: number }> => {
    const info = (await db()).prepare(sql).run(...params);
    return { changes: info.changes };
  },
  /** Run a read statement; returns the matching `{ doc }` rows. */
  all: async (sql: string, params: unknown[]): Promise<{ doc: string }[]> => {
    return (await db()).prepare(sql).all(...params) as { doc: string }[];
  },
  /** Run a read statement; returns the first `{ doc }` row or `undefined`. */
  get: async (sql: string, params: unknown[]): Promise<{ doc: string } | undefined> => {
    return (await db()).prepare(sql).get(...params) as { doc: string } | undefined;
  },
});

/**
 * Renderer-safe contract for the `sqlite` native service.
 *
 * `import type { SqliteContract }` only — importing the VALUE `sqlite` would
 * pull `better-sqlite3`/node into the bundle. The `@sublime-ui/storage` desktop
 * driver consumes this type to adapt `getNative<SqliteContract>('sqlite')` to
 * its `SqliteDriver` port.
 */
export type SqliteContract = typeof sqlite.methods;
```

Add the `sqlite` value export to `desktop/src/services/index.ts` (line 9-13 block):
```ts
// desktop/src/services/index.ts
export { fs } from './fs.js';
export { dialog } from './dialog.js';
export { shell } from './shell.js';
export { clipboard } from './clipboard.js';
export { notifications, type NotifyOptions } from './notifications.js';
export { sqlite } from './sqlite.js';
```

Re-export `sqlite` (value) + `SqliteContract` (type) from the main barrel `desktop/src/index.ts` (built-in services block, lines 60-68):
```ts
// desktop/src/index.ts
// Built-in services.
export {
  fs,
  dialog,
  shell,
  clipboard,
  notifications,
  sqlite,
  type NotifyOptions,
} from './services/index.js';

// Renderer-safe contract type for the sqlite service (type-only; safe to import
// from the storage desktop driver without crossing into node/better-sqlite3).
export type { SqliteContract } from './services/sqlite.js';
```

Add `better-sqlite3` as an optional peer dep, expose `./sqlite` (value entry) + `./sqlite-contract` (type-only entry) in `desktop/package.json`, and mark `better-sqlite3` external in the build. Edit the `exports`, `peerDependencies`, and `peerDependenciesMeta` blocks:
```jsonc
// desktop/package.json — exports block
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js"
  },
  "./client": {
    "types": "./dist/client.d.ts",
    "import": "./dist/client.js"
  },
  "./preload": {
    "types": "./dist/bridge/preload.d.ts",
    "import": "./dist/bridge/preload.js"
  },
  "./sqlite": {
    "types": "./dist/services/sqlite.d.ts",
    "import": "./dist/services/sqlite.js"
  },
  "./sqlite-contract": {
    "types": "./dist/services/sqlite.d.ts"
  }
},
```
```jsonc
// desktop/package.json — peerDependencies + meta (better-sqlite3 optional, main-only)
"peerDependencies": {
  "electron": ">=30",
  "react": ">=18",
  "better-sqlite3": ">=11"
},
"peerDependenciesMeta": {
  "electron": {
    "optional": true
  },
  "react": {
    "optional": true
  },
  "better-sqlite3": {
    "optional": true
  }
},
```
And add `better-sqlite3` to the `external` array in `desktop/tsup.config.ts` (so its dynamic import is never inlined into a built chunk):
```ts
// desktop/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**/*.ts', 'src/**/*.tsx'],
  format: ['esm'],
  dts: true,
  clean: true,
  bundle: false,
  external: ['electron', 'react', 'react-dom', 'better-sqlite3'],
});
```

- [ ] **Step 8: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop && npx vitest run test/services/sqlite.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 9: Extend the bundle-safety guard** — assert `get-native` is renderer-safe and `sqlite` is NOT reachable from the client barrel

Append two cases to `desktop/test/client-bundle-safety.test.ts` inside the existing `describe('renderer bundle safety', …)` block (after the `use-native chain` case at line 84):
```ts
// desktop/test/client-bundle-safety.test.ts — append inside the existing describe
  it('the get-native chain pulls in no node:* or electron specifiers', () => {
    const externals = reachableExternals(resolvePath(srcDir, 'get-native.ts'));
    const offenders = externals.filter((s) => FORBIDDEN.test(s));
    expect(offenders).toEqual([]);
  });

  it('the client barrel does not transitively reach the sqlite service or better-sqlite3', () => {
    const externals = reachableExternals(resolvePath(srcDir, 'client.ts'));
    expect(externals).not.toContain('better-sqlite3');
    // The main-only sqlite service file must not be reachable from ./client.
    const seen = new Set<string>();
    const stack = [resolvePath(srcDir, 'client.ts')];
    const sqliteFile = resolvePath(srcDir, 'services/sqlite.ts');
    let reached = false;
    while (stack.length > 0) {
      const file = stack.pop() as string;
      if (seen.has(file)) continue;
      seen.add(file);
      if (file === sqliteFile) reached = true;
      const code = readFileSync(file, 'utf8');
      for (const spec of importSpecifiers(code)) {
        if (spec.startsWith('.')) {
          const local = resolveLocal(file, spec);
          if (local !== null) stack.push(local);
        }
      }
    }
    expect(reached).toBe(false);
  });
```
- [ ] **Step 10: Run the bundle-safety guard, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop && npx vitest run test/client-bundle-safety.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 11: Full desktop suite + typecheck, verify green**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop && npx vitest run && npx tsc --noEmit`
Expected: PASS (all desktop tests green; no type errors).

- [ ] **Step 12: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add desktop/src/get-native.ts desktop/src/use-native.ts desktop/src/client.ts desktop/src/index.ts desktop/src/services/sqlite.ts desktop/src/services/get-better-sqlite3.ts desktop/src/services/index.ts desktop/package.json desktop/tsup.config.ts desktop/test/get-native.test.ts desktop/test/services/sqlite.test.ts desktop/test/client-bundle-safety.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "feat(desktop): hook-free getNative + built-in sqlite native service (better-sqlite3 main-only)"
```

---

### Task I2: desktop SqliteDriver adapter + wire into createDatabaseAdapter.web.ts (@sublime-ui/storage)

**Files:**
- Create: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage/src/desktop.ts` (single owner — H4 does NOT create this file)
- Modify: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage/src/createDatabaseAdapter.web.ts` (add the desktop branch to H4's web-only resolver)
- Modify: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage/src/index.ts` (add `export { createDesktopSqliteAdapter } from './desktop.js'` to the barrel)
- Modify: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage/package.json` (add `./desktop` export + `@sublime-ui/desktop` peer)
- Test: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage/test/desktopDriver.test.ts`

**Interfaces:**
- Consumes:
  - `getNative<M>(name)` from `@sublime-ui/desktop/client` (value, renderer-safe) — produced by Task I1.
  - `SqliteContract` from `@sublime-ui/desktop/sqlite-contract` (type-only) — produced by Task I1; methods `exec(sql)`, `run(sql, params)`, `all(sql, params)`, `get(sql, params)`.
  - `SqliteDriver` (the driver port: `exec/run/all/get/tx?`) from the storage SqliteAdapter module — produced by Phase H (`storage/src/sqlite/SqliteDriver.ts`).
  - `SqliteAdapter` (constructed from a `SqliteDriver`) from the storage SqliteAdapter module — produced by Phase H (`storage/src/sqlite/SqliteAdapter.ts`).
  - `DatabaseAdapter` type from `@sublime-ui/framework` — produced by Phase F.
  - `createIndexedDbAdapter()` (the IndexedDB fallback) from `storage/src/web.ts` — produced by Phase H; referenced by the existing `createDatabaseAdapter.web.ts`.
- Produces:
  - `createDesktopSqliteDriver(): SqliteDriver | null` — adapts the `@sublime-ui/desktop` `sqlite` native proxy (reached via `getNative('sqlite')`) to the `SqliteDriver` port; `null` when no native bridge is present.
  - `createDesktopSqliteAdapter(): SqliteAdapter` — `new SqliteAdapter(driver)` over the desktop driver (throws if the bridge is absent — callers gate with bridge detection first). Re-exported from the `@sublime-ui/storage` barrel (this is the export H4 deliberately omitted).

- [ ] **Step 1: Write the failing test** — desktop driver adapts the fake desktop sqlite proxy reached via `getNative('sqlite')` over `globalThis.sublimeNative = { invoke }`
```ts
// storage/test/desktopDriver.test.ts
import { afterEach, describe, it, expect, vi } from 'vitest';
import { createDesktopSqliteDriver } from '../src/desktop';

// A fake desktop sqlite native proxy, installed at globalThis.sublimeNative so
// @sublime-ui/desktop's getNative('sqlite') resolves it (getNative reads the
// same bridge useNative does — see desktop/src/get-native.ts).
const exec = vi.fn().mockResolvedValue(undefined);
const run = vi.fn().mockResolvedValue({ changes: 0 });
const all = vi.fn().mockResolvedValue([]);
const get = vi.fn().mockResolvedValue(undefined);

function installBridge(): void {
  (globalThis as unknown as { sublimeNative: { invoke: (m: string, method: string, a: unknown[]) => Promise<unknown> } }).sublimeNative = {
    invoke: (_mod, method, args) => {
      switch (method) {
        case 'exec':
          return exec(args[0]);
        case 'run':
          return run(args[0], args[1]);
        case 'all':
          return all(args[0], args[1]);
        case 'get':
          return get(args[0], args[1]);
        default:
          throw new Error(`unexpected method ${method}`);
      }
    },
  };
}

afterEach(() => {
  vi.clearAllMocks();
  delete (globalThis as unknown as { sublimeNative?: unknown }).sublimeNative;
});

describe('createDesktopSqliteDriver', () => {
  it('returns null when no native bridge is present', () => {
    expect(createDesktopSqliteDriver()).toBeNull();
  });

  it('exec forwards SQL over the sqlite native proxy', async () => {
    installBridge();
    const driver = createDesktopSqliteDriver();
    expect(driver).not.toBeNull();
    await driver!.exec('CREATE TABLE "t" (id TEXT PRIMARY KEY, doc TEXT NOT NULL)');
    expect(exec).toHaveBeenCalledWith('CREATE TABLE "t" (id TEXT PRIMARY KEY, doc TEXT NOT NULL)');
  });

  it('run forwards SQL + params and returns { changes }', async () => {
    installBridge();
    run.mockResolvedValue({ changes: 1 });
    const driver = createDesktopSqliteDriver();
    const res = await driver!.run('INSERT INTO "t"(id,doc) VALUES(?,?)', ['1', '{}']);
    expect(run).toHaveBeenCalledWith('INSERT INTO "t"(id,doc) VALUES(?,?)', ['1', '{}']);
    expect(res).toEqual({ changes: 1 });
  });

  it('all returns the { doc } rows from the proxy', async () => {
    installBridge();
    all.mockResolvedValue([{ doc: '{"a":1}' }, { doc: '{"a":2}' }]);
    const driver = createDesktopSqliteDriver();
    await expect(driver!.all('SELECT doc FROM "t"', [])).resolves.toEqual([
      { doc: '{"a":1}' },
      { doc: '{"a":2}' },
    ]);
    expect(all).toHaveBeenCalledWith('SELECT doc FROM "t"', []);
  });

  it('get returns the first { doc } row or undefined', async () => {
    installBridge();
    get.mockResolvedValue({ doc: '{"a":1}' });
    const driver = createDesktopSqliteDriver();
    await expect(driver!.get('SELECT doc FROM "t" WHERE id=?', ['1'])).resolves.toEqual({
      doc: '{"a":1}',
    });
    get.mockResolvedValue(undefined);
    await expect(driver!.get('SELECT doc FROM "t" WHERE id=?', ['9'])).resolves.toBeUndefined();
  });

  it('does not expose a tx (desktop defers multi-statement transactions in SP1)', () => {
    installBridge();
    const driver = createDesktopSqliteDriver();
    expect(driver!.tx).toBeUndefined();
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage && npx vitest run test/desktopDriver.test.ts`
Expected: FAIL — `Failed to resolve import "../src/desktop"` (the module does not exist yet).

- [ ] **Step 3: Create `storage/src/desktop.ts`**
```ts
// storage/src/desktop.ts
/**
 * Desktop SQLite plumbing for `@sublime-ui/storage`.
 *
 * On desktop the web bundle runs inside the Electron renderer, where the
 * `@sublime-ui/desktop` native bridge exposes a built-in `sqlite` service backed
 * by `better-sqlite3` in the MAIN process. This module adapts that service's
 * renderer-safe proxy (reached hook-free via `getNative('sqlite')`) to the
 * platform-agnostic {@link SqliteDriver} port, which feeds the shared
 * {@link SqliteAdapter}. No native module is imported here — only the type-only
 * {@link SqliteContract} — so this file is safe in the web/renderer graph.
 *
 * Transactions are intentionally NOT implemented in SP1 (the driver omits `tx`),
 * so `DbGateway` falls back to sequential awaits; a future `sqlite.batch()` over
 * one IPC adds it.
 */

import { getNative } from '@sublime-ui/desktop/client';
import { SqliteAdapter } from './sqlite/SqliteAdapter.js';
import type { SqliteDriver } from './sqlite/SqliteDriver.js';
import type { SqliteContract } from '@sublime-ui/desktop/sqlite-contract';

/**
 * Build a {@link SqliteDriver} backed by the desktop `sqlite` native proxy.
 *
 * @returns the driver, or `null` when no native bridge is present (plain web).
 */
export function createDesktopSqliteDriver(): SqliteDriver | null {
  const native = getNative<SqliteContract>('sqlite');
  if (native === null) {
    return null;
  }
  return {
    exec: (sql) => native.exec(sql),
    run: (sql, params) => native.run(sql, params),
    all: (sql, params) => native.all(sql, params),
    get: (sql, params) => native.get(sql, params),
    // `tx` deliberately omitted: desktop defers multi-statement transactions (SP1).
  };
}

/**
 * Build a {@link SqliteAdapter} over the desktop SQLite driver.
 *
 * @throws if no native bridge is present — callers must detect the bridge first
 * (see `createDatabaseAdapter.web.ts`); this is the SQLite-over-IPC branch.
 */
export function createDesktopSqliteAdapter(): SqliteAdapter {
  const driver = createDesktopSqliteDriver();
  if (driver === null) {
    throw new Error(
      'createDesktopSqliteAdapter: no @sublime-ui/desktop native bridge detected; ' +
        'use createDatabaseAdapter() which falls back to IndexedDB on plain web.',
    );
  }
  return new SqliteAdapter(driver);
}
```
- [ ] **Step 3b: Add `createDesktopSqliteAdapter` to the storage barrel** so the `./desktop.js` value surface is reachable from `@sublime-ui/storage` (it was intentionally omitted in H4 because this file did not exist yet). Add this line to `storage/src/index.ts`:
```ts
export { createDesktopSqliteAdapter } from './desktop.js';
```
- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage && npx vitest run test/desktopDriver.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Extend H4's failing test** — `createDatabaseAdapter()` (web entry) auto-upgrades to SQLite when the bridge is present. Add the bridge-present case to H4's `storage/test/createDatabaseAdapter.test.ts` (H4 already asserts the no-bridge → IndexedDb case). The bridge fixture is the REAL shape `getNative` reads: `globalThis.sublimeNative = { invoke }` (NOT `{ sqlite: {...} }`). Append:
```ts
// storage/test/createDatabaseAdapter.test.ts — append (I2 adds the bridge-present case)
import { vi } from 'vitest';
import { SqliteAdapter } from '../src/sqlite/SqliteAdapter.js';

describe('createDatabaseAdapter (web entry) — desktop bridge detection (I2)', () => {
  function installBridge(): void {
    (globalThis as unknown as { sublimeNative: { invoke: (m: string, method: string, a: unknown[]) => Promise<unknown> } }).sublimeNative = {
      invoke: async (_mod, method) => {
        switch (method) {
          case 'exec':
            return undefined;
          case 'all':
            return [];
          case 'get':
            return undefined;
          case 'run':
            return { changes: 0 };
          default:
            throw new Error(`unexpected method ${method}`);
        }
      },
    };
  }

  afterEach(() => {
    vi.clearAllMocks();
    delete (globalThis as unknown as { sublimeNative?: unknown }).sublimeNative;
  });

  it('returns a SQLite-over-IPC adapter when the desktop native bridge is present', () => {
    installBridge();
    const adapter = createDatabaseAdapter();
    expect(adapter).toBeInstanceOf(SqliteAdapter);
  });
});
```
- [ ] **Step 6: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage && npx vitest run test/createDatabaseAdapter.test.ts`
Expected: FAIL — `createDatabaseAdapter` returns an IndexedDB adapter even with the bridge installed (the bridge-detected branch is not yet wired to the desktop driver), so `toBeInstanceOf(SqliteAdapter)` fails.

- [ ] **Step 7: Add the desktop branch to H4's web-only `createDatabaseAdapter.web.ts`**

Update `storage/src/createDatabaseAdapter.web.ts` (web-only from H4) so it detects the desktop native bridge via `getNative('sqlite')` (which works over `globalThis.sublimeNative.invoke` — the one real IPC channel, surfaced through `createDesktopSqliteDriver()`); if a sqlite native proxy is available, return `createDesktopSqliteAdapter()`, else fall back to IndexedDB. The complete file:
```ts
// storage/src/createDatabaseAdapter.web.ts
/**
 * Web/renderer resolver for the platform DatabaseAdapter.
 *
 * The web bundler picks this `.web.ts` entry. At RUNTIME it probes for the
 * desktop native bridge via `getNative('sqlite')` (from `@sublime-ui/desktop/client`,
 * which forwards over `globalThis.sublimeNative.invoke` — the single real IPC
 * channel): on desktop (where the web bundle runs inside Electron) it returns the
 * SQLite-over-IPC adapter; on plain web it returns the IndexedDB adapter. No
 * native module is imported — the desktop path goes through
 * `@sublime-ui/desktop/client` (renderer-safe) and a type-only `SqliteContract`.
 */

import { createIndexedDbAdapter } from './web.js';
import { createDesktopSqliteDriver, createDesktopSqliteAdapter } from './desktop.js';
import type { DatabaseAdapter } from '@sublime-ui/framework';

/** Resolve the DatabaseAdapter for the web bundle (desktop-aware). */
export function createDatabaseAdapter(): DatabaseAdapter {
  // Probe the desktop native bridge: createDesktopSqliteDriver() returns null on
  // plain web (no globalThis.sublimeNative) and a driver inside Electron.
  if (createDesktopSqliteDriver() !== null) {
    // Desktop: the web bundle is running inside Electron with the native bridge.
    return createDesktopSqliteAdapter();
  }
  // Plain web: no native bridge — use IndexedDB.
  return createIndexedDbAdapter();
}
```
> Note on existing code: H4's `createDatabaseAdapter.web.ts` is web-only (`return new IndexedDbAdapter()` / `createIndexedDbAdapter()`). This task ADDS the desktop branch, gated by `createDesktopSqliteDriver()` (which itself uses `getNative('sqlite')`), and keeps the IndexedDB fallback. The bridge fixture in tests is `globalThis.sublimeNative = { invoke }` — the real shape `getNative` reads — never `{ sqlite: {...} }`.

- [ ] **Step 8: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage && npx vitest run test/createDatabaseAdapter.test.ts`
Expected: PASS (both the H4 no-bridge → IndexedDb case and the I2 bridge-present → SqliteAdapter case).

- [ ] **Step 9: Add the `./desktop` export + `@sublime-ui/desktop` peer to `storage/package.json`**

Add `./desktop` to the `exports` map (per §7.5) and declare `@sublime-ui/desktop` as a peer dependency (the desktop driver imports `@sublime-ui/desktop/client`):
```jsonc
// storage/package.json — exports block (add ./desktop)
"exports": {
  ".":        "./dist/index.js",
  "./web":    "./dist/web.js",
  "./desktop": "./dist/desktop.js",
  "./mobile": "./dist/mobile.js"
},
```
```jsonc
// storage/package.json — add to peerDependencies + peerDependenciesMeta
"peerDependencies": {
  "@sublime-ui/framework": "workspace:*",
  "@sublime-ui/desktop": "workspace:*"
},
"peerDependenciesMeta": {
  "@sublime-ui/desktop": {
    "optional": true
  }
},
```
> Note: keep any existing peers (`idb`, `expo-sqlite`, `better-sqlite3`) added by Phase H; this task only ADDS `@sublime-ui/desktop` and the `./desktop` export. The `@sublime-ui/desktop` `./client` and `./sqlite-contract` subpath entries are produced by Task I1.

- [ ] **Step 10: Storage suite + typecheck, verify green**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage && npx vitest run && npx tsc --noEmit`
Expected: PASS (all storage tests green; no type errors; the desktop driver file imports only `@sublime-ui/desktop/client` + type-only `SqliteContract`, so no native module enters the web/renderer graph).

- [ ] **Step 11: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add storage/src/desktop.ts storage/src/createDatabaseAdapter.web.ts storage/src/index.ts storage/package.json storage/test/desktopDriver.test.ts storage/test/createDatabaseAdapter.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "feat(storage): desktop SqliteDriver over native bridge + wire into web adapter resolver"
```


### Task J1: Cross-backend Query conformance fixture + runner (CI gate)

**Files:**
- Create: `storage/test/fixtures/query-conformance.ts` (pure data — re-homed into the storage workspace)
- Create: `storage/test/query-conformance.test.ts`
- Test: `storage/test/query-conformance.test.ts`

**Interfaces:**
- Consumes: `applyQuery(rows: Row[], q: Query): Row[]` (from `@sublime-ui/framework`), `Query`/`QueryFilter`/`QuerySort` types, `InMemoryGateway` (from `@sublime-ui/framework`), `GatewayDeps` (from `@sublime-ui/framework`), `SqliteAdapter` (from `../src/sqlite/SqliteAdapter.js`), `IndexedDbAdapter` (from `../src/web.js`), the local `./fixtures/query-conformance.js` data, `fake-indexeddb`, `better-sqlite3`. (The `@sublime-ui/framework` specifier resolves via the H1 vitest alias to `../framework/src/index.ts` — no build needed.)
- Produces: `conformanceCases: { name: string; query: Query; expectedIds: Array<string|number> }[]` (~15 cases) + `conformanceRows`, consumed by the storage-local conformance runner. The REST `toQueryString` portion stays a framework test (B3's `toQueryString.test.ts` already covers it) — not imported across workspaces here.

- [ ] **Step 1: Write the failing test**

First author the fixture file (no test yet — it's PURE DATA, re-homed into the storage workspace so there is no cross-workspace test import):
```ts
// storage/test/fixtures/query-conformance.ts
import type { Query, Row } from '@sublime-ui/framework';

/**
 * A single shared dataset every backend is loaded with before running the cases.
 * Plain serializable rows (string ids — the UUID/PK convention) with a mix of
 * string / number / boolean / null fields so every FilterOp is exercised.
 */
export const conformanceRows: Row[] = [
  { id: 'a', name: 'Alpha',  qty: 10, active: true,  tag: 'red',   note: null },
  { id: 'b', name: 'bravo',  qty: 20, active: false, tag: 'green', note: 'hello world' },
  { id: 'c', name: 'Cobra',  qty: 30, active: true,  tag: 'blue',  note: 'WORLD peace' },
  { id: 'd', name: 'delta',  qty: 20, active: true,  tag: 'red',   note: 'other' },
  { id: 'e', name: 'Echo',   qty: 40, active: false, tag: 'green', note: null },
];

export const conformanceCases: {
  name: string;
  query: Query;
  /** Ids in the EXACT order the backend must return them (sort-sensitive). */
  expectedIds: Array<string | number>;
}[] = [
  { name: 'empty query -> all rows (insertion order)',
    query: {}, expectedIds: ['a', 'b', 'c', 'd', 'e'] },

  { name: 'eq string',
    query: { filters: [{ field: 'tag', op: 'eq', value: 'red' }] },
    expectedIds: ['a', 'd'] },

  { name: 'ne string',
    query: { filters: [{ field: 'tag', op: 'ne', value: 'red' }] },
    expectedIds: ['b', 'c', 'e'] },

  { name: 'eq boolean true',
    query: { filters: [{ field: 'active', op: 'eq', value: true }] },
    expectedIds: ['a', 'c', 'd'] },

  { name: 'gt number',
    query: { filters: [{ field: 'qty', op: 'gt', value: 20 }] },
    expectedIds: ['c', 'e'] },

  { name: 'gte number',
    query: { filters: [{ field: 'qty', op: 'gte', value: 20 }] },
    expectedIds: ['b', 'c', 'd', 'e'] },

  { name: 'lt number',
    query: { filters: [{ field: 'qty', op: 'lt', value: 30 }] },
    expectedIds: ['a', 'b', 'd'] },

  { name: 'lte number',
    query: { filters: [{ field: 'qty', op: 'lte', value: 20 }] },
    expectedIds: ['a', 'b', 'd'] },

  { name: 'in number list',
    query: { filters: [{ field: 'qty', op: 'in', value: [10, 40] }] },
    expectedIds: ['a', 'e'] },

  { name: 'in string list',
    query: { filters: [{ field: 'tag', op: 'in', value: ['blue', 'green'] }] },
    expectedIds: ['b', 'c', 'e'] },

  { name: 'like is case-insensitive contains',
    query: { filters: [{ field: 'note', op: 'like', value: 'world' }] },
    expectedIds: ['b', 'c'] },

  { name: 'eq null matches only null notes',
    query: { filters: [{ field: 'note', op: 'eq', value: null }] },
    expectedIds: ['a', 'e'] },

  { name: 'two filters ANDed',
    query: { filters: [
      { field: 'tag', op: 'eq', value: 'red' },
      { field: 'active', op: 'eq', value: true },
    ] },
    expectedIds: ['a', 'd'] },

  { name: 'sort asc with nulls first',
    query: { sort: [{ field: 'note', dir: 'asc' }] },
    expectedIds: ['a', 'e', 'b', 'd', 'c'] },

  { name: 'multi-key sort (qty asc, name asc) then limit/offset',
    query: { sort: [{ field: 'qty', dir: 'asc' }, { field: 'name', dir: 'asc' }],
             limit: 2, offset: 1 },
    expectedIds: ['b', 'd'] },
];
```

Now the runner. The IndexedDbAdapter and the in-process SqliteDriver both live in `@sublime-ui/storage`, so the runner is authored in `storage/test/` and imports the fixture LOCALLY (no cross-workspace test import). `@sublime-ui/framework` resolves via the H1 vitest alias to `../framework/src/index.ts`:
```ts
// storage/test/query-conformance.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import Database from 'better-sqlite3';
import {
  conformanceRows,
  conformanceCases,
} from './fixtures/query-conformance.js';
import {
  InMemoryGateway,
  applyQuery,
  type GatewayDeps,
  type Row,
  type Query,
} from '@sublime-ui/framework';
import { SqliteAdapter } from '../src/sqlite/SqliteAdapter.js';
import { IndexedDbAdapter } from '../src/web.js';

const RESOURCE = 'widgets';

/** Minimal in-process better-sqlite3 driver satisfying the SqliteDriver port. */
function makeSqliteDriver() {
  const db = new Database(':memory:');
  return {
    async exec(sql: string) { db.exec(sql); },
    async run(sql: string, params: unknown[]) {
      const info = db.prepare(sql).run(...(params as never[]));
      return { changes: info.changes };
    },
    async all(sql: string, params: unknown[]) {
      return db.prepare(sql).all(...(params as never[])) as { doc: string }[];
    },
    async get(sql: string, params: unknown[]) {
      return db.prepare(sql).get(...(params as never[])) as { doc: string } | undefined;
    },
  };
}

/** Build each adapter/gateway, seed it with conformanceRows in insertion order. */
async function seededInMemory(): Promise<(q: Query) => Promise<Row[]>> {
  let items: Row[] = [];
  const store = { getState: () => ({ [RESOURCE]: { items } }) } as unknown as GatewayDeps['store'];
  const deps: GatewayDeps = {
    resource: RESOURCE, idKey: 'id', sliceName: RESOURCE,
    actions: {} as GatewayDeps['actions'], store,
  };
  const gw = new InMemoryGateway(deps);
  items = conformanceRows.map((r) => ({ ...r }));
  return (q: Query) => gw.index(q);
}

async function seededSqlite(): Promise<(q: Query) => Promise<Row[]>> {
  const adapter = new SqliteAdapter(makeSqliteDriver());
  await adapter.ensureCollection(RESOURCE);
  for (const r of conformanceRows) await adapter.insert(RESOURCE, { ...r });
  return (q: Query) => adapter.query(RESOURCE, q);
}

async function seededIdb(): Promise<(q: Query) => Promise<Row[]>> {
  const adapter = new IndexedDbAdapter();
  await adapter.ensureCollection(RESOURCE);
  for (const r of conformanceRows) await adapter.insert(RESOURCE, { ...r });
  return (q: Query) => adapter.query(RESOURCE, q);
}

const ids = (rows: Row[]) => rows.map((r) => String(r['id']));

describe('Query conformance — identical results across backends (CI gate)', () => {
  beforeEach(() => { globalThis.indexedDB = new IDBFactory(); });

  describe('InMemoryGateway', () => {
    for (const c of conformanceCases) {
      it(c.name, async () => {
        const run = await seededInMemory();
        expect(ids(await run(c.query))).toEqual(c.expectedIds.map(String));
      });
    }
  });

  describe('SqliteAdapter (better-sqlite3, in-process)', () => {
    for (const c of conformanceCases) {
      it(c.name, async () => {
        const run = await seededSqlite();
        expect(ids(await run(c.query))).toEqual(c.expectedIds.map(String));
      });
    }
  });

  describe('IndexedDbAdapter (fake-indexeddb)', () => {
    for (const c of conformanceCases) {
      it(c.name, async () => {
        const run = await seededIdb();
        expect(ids(await run(c.query))).toEqual(c.expectedIds.map(String));
      });
    }
  });

  it('applyQuery oracle agrees with every fixture case', () => {
    for (const c of conformanceCases) {
      expect(ids(applyQuery(conformanceRows.map((r) => ({ ...r })), c.query))).toEqual(
        c.expectedIds.map(String),
      );
    }
  });
});
```
> REST serialization (`toQueryString`) conformance stays a FRAMEWORK test —
> B3's `framework/test/toQueryString.test.ts` already covers it — so it is NOT
> imported across workspaces here.
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage && npx vitest run test/query-conformance.test.ts`
Expected: FAIL — `Cannot find module './fixtures/query-conformance.js'` until the fixture file is created; once the fixture exists, the runner imports the adapters and asserts every backend returns the same id set as `expectedIds`.
- [ ] **Step 3: Finalize the fixture + runner (complete code)**

The fixture content is exactly the file written in Step 1 (`storage/test/fixtures/query-conformance.ts`). The runner content is exactly the file written in Step 1 (`storage/test/query-conformance.test.ts`). No further code is required — both files are complete. Ensure `better-sqlite3` and `fake-indexeddb` are devDependencies of the `storage` workspace (added when the adapters were built).
- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage && npx vitest run test/query-conformance.test.ts`
Expected: PASS — all three backends return identical `expectedIds` for every case, and the `applyQuery` oracle agrees.
- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add storage/test/fixtures/query-conformance.ts storage/test/query-conformance.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "test(storage): cross-backend Query conformance fixture + CI-gate runner"
```

---

### Task J2: Mixed-backend integration test (HTTP User + InMemory Note, one store)

**Files:**
- Create: `framework/test/mixed-backend.test.ts`
- Create: `framework/test/id-roundtrip.test.ts` (spec test #15 — id survival across backends)
- Test: `framework/test/mixed-backend.test.ts`, `framework/test/id-roundtrip.test.ts`

**Interfaces:**
- Consumes: `Model`, `registerModel`, `HttpGateway`, `configureSublime`, `store` (from `@sublime-ui/framework`), `resetConfig` (from `framework/src/config/Config.js`), `mockFetch` (from `framework/src/test-utils/mockFetch.js`), `vi` (from `vitest`).
- Produces: nothing consumed by later tasks (leaf integration specs).

- [ ] **Step 1: Write the failing test**
```ts
// framework/test/mixed-backend.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Model, registerModel, HttpGateway, configureSublime, store } from '../src/index.js';
import { resetConfig } from '../src/config/Config.js';
import { mockFetch } from '../src/test-utils/mockFetch.js';

// User is server-backed (REST). Note is in-memory (the new default).
class User extends Model {
  protected static override resource = '/users';
  declare id: number;
  declare name: string;
}
class Note extends Model {
  protected static override resource = 'notes';
  declare id: string;
  declare title: string;
}
registerModel(User as unknown as { name: string; resource?: string }, HttpGateway);
registerModel(Note as unknown as { name: string; resource?: string }); // in-memory default

describe('mixed-backend app — HTTP + in-memory in one store', () => {
  beforeEach(() => {
    resetConfig();
    // NOTE: no databaseAdapter, and baseURL present only for the HTTP model.
    configureSublime({ baseURL: 'https://api.example.com', platform: 'web' });
    store.dispatch({ type: 'users/reset' });
    store.dispatch({ type: 'notes/reset' });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('Note CRUD works with no databaseAdapter and no per-model baseURL', async () => {
    const created = await new Note({ title: 'first' }).save(); // create (no id) -> genId
    expect(typeof created.id).toBe('string');
    expect(created.title).toBe('first');

    const all = await Note.all();
    expect(all.map((n) => n.title)).toEqual(['first']);

    const found = await Note.find(created.id);
    expect(found?.title).toBe('first');

    const missing = await Note.find('does-not-exist');
    expect(missing).toBeNull(); // absence -> null, no throw

    await created.delete();
    expect((await Note.all()).length).toBe(0);
  });

  it('User.all() hits fetch (HTTP-backed model) and never touches the DB adapter', async () => {
    const seen: string[] = [];
    mockFetch(({ url, method }) => {
      seen.push(`${method} ${url}`);
      return { json: { success: true, message: '', data: [{ id: 1, name: 'ada' }], errors: null } };
    });

    const users = await User.all();
    expect(users.map((u) => u.name)).toEqual(['ada']);
    expect(seen).toEqual(['GET https://api.example.com/users']);
  });

  it('absence of a databaseAdapter does not break HTTP or in-memory models', async () => {
    mockFetch(() => ({ json: { success: true, message: '', data: [{ id: 7, name: 'grace' }], errors: null } }));
    const [users] = await Promise.all([User.all(), Note.all()]);
    expect(users[0]?.name).toBe('grace');
    // No ConfigError for the missing databaseAdapter — neither model uses DbGateway.
    await expect(new Note({ title: 'x' }).save()).resolves.toBeInstanceOf(Note);
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/mixed-backend.test.ts`
Expected: FAIL with `"does not provide an export named 'HttpGateway'"` (until the barrel exports `HttpGateway`) or, if the barrel is already updated, a `ConfigError`/type failure from `configureSublime({ baseURL, platform })` until Config HTTP fields are optional and the in-memory default is wired.
- [ ] **Step 3: Implement — no code changes here; this test is satisfied by already-landed Phase B/C work**

This is a pure integration assertion over the in-memory default (`registerModel(M)` → `InMemoryGateway`), the `HttpGateway` overload, optional Config HTTP/DB fields, and `genId`-on-create. All of those ship in earlier phases. The only action in this task is authoring the test; if it fails because the barrel does not yet export `HttpGateway` or Config still requires `baseURL`/`databaseAdapter`, that indicates a regression in the prerequisite work and must be fixed there, not here. Re-run after confirming the barrel exports `HttpGateway`, `InMemoryGateway`, `registerModel`, and that `SublimeConfig.baseURL`/`databaseAdapter` are optional.
- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/mixed-backend.test.ts`
Expected: PASS — Note CRUD round-trips in the slice with zero config; `User.all()` issues exactly `GET https://api.example.com/users`; no `ConfigError` for the absent `databaseAdapter`.
- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add framework/test/mixed-backend.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "test(framework): mixed-backend integration — HTTP User + in-memory Note in one store"
```

#### Task J2b: id round-trip across backends (spec test #15)

A focused leaf spec asserting that ids survive a full `find`/`save`/`delete`
round-trip on both a UUID-keyed in-memory model and a numeric-keyed HTTP model
(stubbed fetch) — proving the Model layer never coerces or drops the id key.

- [ ] **Step 1: Write the failing test**
```ts
// framework/test/id-roundtrip.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Model, registerModel, HttpGateway, configureSublime, store } from '../src/index.js';
import { resetConfig } from '../src/config/Config.js';

// UUID-keyed, in-memory (default gateway).
class Doc extends Model {
  protected static override resource = 'docs';
  declare id: string;
  declare title: string;
}
// Numeric-keyed, HTTP-backed.
class Account extends Model {
  protected static override resource = '/accounts';
  declare id: number;
  declare email: string;
}
registerModel(Doc as unknown as { name: string; resource?: string });
registerModel(Account as unknown as { name: string; resource?: string }, HttpGateway);

describe('id round-trip — ids survive find/save/delete across backends (spec #15)', () => {
  beforeEach(() => {
    resetConfig();
    configureSublime({ baseURL: 'https://api.example.com', platform: 'web' });
    store.dispatch({ type: 'docs/reset' });
    store.dispatch({ type: 'accounts/reset' });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('UUID-keyed in-memory model preserves a string id through save/find/delete', async () => {
    const uuid = '7f3b2c1a-0d4e-4a6b-9c8d-1e2f3a4b5c6d';
    const created = await new Doc({ id: uuid, title: 'spec' }).save();
    expect(created.id).toBe(uuid); // string id not coerced

    const found = await Doc.find(uuid);
    expect(found?.id).toBe(uuid);

    await created.delete();
    expect(await Doc.find(uuid)).toBeNull();
  });

  it('numeric-keyed HTTP model preserves a number id through save/find/delete', async () => {
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method === 'POST') {
        return { ok: true, status: 201, json: async () => ({ success: true, message: '', data: { id: 42, email: 'a@b.c' }, errors: null }) } as Response;
      }
      if (method === 'DELETE') {
        return { ok: true, status: 204, json: async () => ({ success: true, message: '', data: null, errors: null }) } as Response;
      }
      // GET /accounts/42
      return { ok: true, status: 200, json: async () => ({ success: true, message: '', data: { id: 42, email: 'a@b.c' }, errors: null }) } as Response;
    });

    const saved = await new Account({ email: 'a@b.c' }).save();
    expect(saved.id).toBe(42);
    expect(typeof saved.id).toBe('number'); // numeric id not stringified

    const found = await Account.find(42);
    expect(found?.id).toBe(42);

    await saved.delete();
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/id-roundtrip.test.ts`
Expected: FAIL until the file exists; if the barrel does not yet export `HttpGateway`/the in-memory default is unwired, that is a prerequisite-phase regression (fix there, not here).
- [ ] **Step 3: Implement — no code changes here**
Like J2, this is a pure integration assertion satisfied by already-landed Phase B/C/F work (genId-on-create, raw-row gateways, numeric/string id preservation). The only action is authoring the test.
- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/id-roundtrip.test.ts`
Expected: PASS — both ids survive the round-trip with their original type.
- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add framework/test/id-roundtrip.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "test(framework): id round-trip across in-memory + HTTP backends (spec #15)"
```

---

### Task J3: Changeset, facts-brief correction, #2-spec banner, devkit scaffold + generator comment

**Files:**
- Create: `.changeset/sp1-storage-agnostic-gateway.md`
- Modify: `docs/notes/framework-facts-brief.md:24-27`
- Modify: `docs/superpowers/specs/2026-06-18-sublime-ui-framework-core-design.md:1-4`
- Modify: `devkit/src/lib/scaffold/templates/shared.ts:2-13`
- Modify: `devkit/src/lib/generators/render-model.ts:14-22`
- Modify: `devkit/test/scaffold/shared-templates.test.ts:8-14`
- Modify: `devkit/test/generators/render-model.test.ts:5-25`
- Modify: `devkit/test/generators/make-model.test.ts:12-21`
- Test: `devkit/test/scaffold/shared-templates.test.ts`, `devkit/test/generators/render-model.test.ts`, `devkit/test/generators/make-model.test.ts`

**Interfaces:**
- Consumes: `renderTaskModel()`, `renderModelsBarrel()`, `renderThemeTokensJson()`, `renderThemeTokensTs()` (from `devkit/src/lib/scaffold/templates/shared.js`); `renderModel(opts)` (from `devkit/src/lib/generators/render-model.js`); `makeModel(opts)` (from `devkit/src/commands/make-model.js`).
- Produces: scaffold/generator output now carrying the in-memory-default comment; consumed only by these snapshot tests.

- [ ] **Step 1: Write the failing test (update the three snapshot tests to require the new comment)**

Update `devkit/test/scaffold/shared-templates.test.ts` — replace the `Task model` case body so it also asserts the in-memory comment:
```ts
// devkit/test/scaffold/shared-templates.test.ts
import { describe, it, expect } from 'vitest';
import {
  renderTaskModel, renderModelsBarrel, renderThemeTokensJson, renderThemeTokensTs,
} from '../../src/lib/scaffold/templates/shared.js';

describe('shared templates', () => {
  it('Task model extends Model and registers itself in-memory by default', () => {
    const src = renderTaskModel();
    expect(src).toContain("from '@sublime-ui/framework'");
    expect(src).toContain('export class Task extends Model');
    expect(src).toContain('registerModel(Task)');
    expect(src).toContain("resource = '/tasks'");
    expect(src).toContain('// In-memory by default. For REST: registerModel(Task, HttpGateway).');
  });
  it('models barrel re-exports Task', () => {
    expect(renderModelsBarrel()).toContain("export * from './Task.js'");
  });
  it('theme tokens render valid JSON + a typed wrapper', () => {
    expect(() => JSON.parse(renderThemeTokensJson())).not.toThrow();
    expect(renderThemeTokensTs()).toContain('export const tokens');
  });
});
```

Update `devkit/test/generators/render-model.test.ts` to require the comment in generated models:
```ts
// devkit/test/generators/render-model.test.ts
import { describe, it, expect } from 'vitest';
import { renderModel } from '../../src/lib/generators/render-model.js';

describe('renderModel', () => {
  it('renders a Model with declare fields, resource, and registerModel', () => {
    const out = renderModel({
      className: 'User',
      resource: '/users',
      importAlias: '@sublime-ui',
      fields: [
        { name: 'id', tsType: 'number' },
        { name: 'name', tsType: 'string' },
      ],
    });
    expect(out).toContain("import { Model, registerModel } from '@sublime-ui/framework';");
    expect(out).toContain('export class User extends Model {');
    expect(out).toContain("protected static resource = '/users';");
    expect(out).toContain('declare id: number;');
    expect(out).toContain('declare name: string;');
    expect(out).toContain('registerModel(User);');
    expect(out).toContain('// In-memory by default. For REST: registerModel(User, HttpGateway).');
  });
  it('always includes an id field even when none provided', () => {
    const out = renderModel({ className: 'Tag', resource: '/tags', importAlias: '@sublime-ui', fields: [] });
    expect(out).toContain('declare id: number;');
  });
});
```

Update `devkit/test/generators/make-model.test.ts` first case to assert the comment is written to disk:
```ts
// devkit/test/generators/make-model.test.ts  (replace the first `it` block only)
  it('writes the model file and updates the barrel', async () => {
    const code = await makeModel({ name: 'User', cwd: dir, fields: 'name:string', force: false });
    expect(code).toBe(0);
    const model = readFileSync(join(dir, 'src/models/User.ts'), 'utf8');
    expect(model).toContain('export class User extends Model {');
    expect(model).toContain('declare name: string;');
    expect(model).toContain('registerModel(User);');
    expect(model).toContain('// In-memory by default. For REST: registerModel(User, HttpGateway).');
    const barrel = readFileSync(join(dir, 'src/models/index.ts'), 'utf8');
    expect(barrel).toContain("export * from './User.js';");
  });
```
- [ ] **Step 2: Run the tests, verify they fail**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/devkit && npx vitest run test/scaffold/shared-templates.test.ts test/generators/render-model.test.ts test/generators/make-model.test.ts`
Expected: FAIL — three assertions fail with `expected '<rendered source>' to contain '// In-memory by default. For REST: registerModel(...)'` because neither template emits the comment yet.
- [ ] **Step 3: Implement — add the comment to both templates, write the changeset, fix the facts brief, banner the #2 spec**

Edit `devkit/src/lib/scaffold/templates/shared.ts` (`renderTaskModel`, lines 2-13) to emit the comment:
```ts
// devkit/src/lib/scaffold/templates/shared.ts
export function renderTaskModel(): string {
  return `import { Model, registerModel } from '@sublime-ui/framework';

/** A sample model. Replace with your own — see the docs on the Model layer. */
export class Task extends Model {
  protected static resource = '/tasks';
  declare id: number;
  declare name: string;
  declare done: boolean;
}
// In-memory by default. For REST: registerModel(Task, HttpGateway).
registerModel(Task);
`;
}
```

Edit `devkit/src/lib/generators/render-model.ts` (lines 14-22) so generated models carry the same comment:
```ts
// devkit/src/lib/generators/render-model.ts
import type { ModelField } from './fields.js';

export function renderModel(opts: {
  className: string;
  resource: string;
  fields: ModelField[];
  importAlias: string;
}): string {
  const hasId = opts.fields.some((f) => f.name === 'id');
  const fields = hasId
    ? opts.fields
    : [{ name: 'id', tsType: 'number' }, ...opts.fields];
  const declares = fields.map((f) => `  declare ${f.name}: ${f.tsType};`).join('\n');
  return `import { Model, registerModel } from '${opts.importAlias}/framework';

export class ${opts.className} extends Model {
  protected static resource = '${opts.resource}';
${declares}
}

// In-memory by default. For REST: registerModel(${opts.className}, HttpGateway).
registerModel(${opts.className});
`;
}
```

Create the changeset `.changeset/sp1-storage-agnostic-gateway.md`:
```markdown
---
"@sublime-ui/framework": minor
---

SP1 — Storage-Agnostic Gateway. `Model` now talks to a pluggable `Gateway`
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
```

Edit `docs/notes/framework-facts-brief.md` lines 24-27 to reflect the new default + error tree + raw-row contract:
```markdown
- Async commands (throw a typed `DataError` on real failure; absence is `null`, not an error): `User.all()`, `User.find(id)`, `user.save()`, `user.delete()`, `User.call(...)` for custom endpoints (HTTP-backed models only).
- Reactive React hooks (cache-first; fetch + cache if missing): `User.rxAll()`, `User.rxFind(id)`.
- `registerModel(Model)` wires an **in-memory** Gateway by default (the Redux slice is the source of truth — zero config). `registerModel(Model, HttpGateway)` uses REST; `registerModel(Model, DbGateway)` uses a local document DB. All three auto-register a Redux slice + a discovery registry; casting keeps plain JSON in the store (`hydrate`/`toPlain`).
- Gateway = a pluggable storage **strategy** (`index/show/create/update/destroy`) returning raw rows and throwing a typed `DataError` (`HttpError`, `NetworkError`, `AuthError`, `NotFoundError`, `ConfigError`, `StorageError`; `ValidationError` reserved). `ApiResponse<T> = { success, message, data, errors }` is **HTTP-internal** — the REST gateway unwraps it; it is not part of the Model data contract.
```

Edit `docs/superpowers/specs/2026-06-18-sublime-ui-framework-core-design.md` lines 1-4 to add the SP1 banner directly under the title:
```markdown
# Sublime UI — Framework App-Architecture Core (#2) — Design

> **Superseded in part by SP1 (Storage-Agnostic Gateway).** The "Gateway =
> API-only (REST today; DB Gateway roadmapped)" decision in this doc is
> delivered and revised by SP1: `Model` now talks to a pluggable `Gateway`
> interface with three strategies (in-memory default · REST · local DB). See
> [`docs/superpowers/specs/2026-06-20-sublime-ui-storage-agnostic-gateway-design.md`](2026-06-20-sublime-ui-storage-agnostic-gateway-design.md).

Date: 2026-06-18
Status: Draft (pending written-spec review)
```
- [ ] **Step 4: Run the tests, verify they pass**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/devkit && npx vitest run test/scaffold/shared-templates.test.ts test/generators/render-model.test.ts test/generators/make-model.test.ts`
Expected: PASS — all three suites green; both templates emit the in-memory comment.
- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add .changeset/sp1-storage-agnostic-gateway.md docs/notes/framework-facts-brief.md docs/superpowers/specs/2026-06-18-sublime-ui-framework-core-design.md devkit/src/lib/scaffold/templates/shared.ts devkit/src/lib/generators/render-model.ts devkit/test/scaffold/shared-templates.test.ts devkit/test/generators/render-model.test.ts devkit/test/generators/make-model.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "chore(release): SP1 changeset + facts-brief/#2-spec corrections + devkit in-memory-default comment"
```

---

### Task J4: CI infra — core-purity import guard + documented packaged-desktop/JSON1 assertions

**Files:**
- Create: `framework/test/no-native-imports.test.ts`
- Create: `storage/test/web-bundle-purity.test.ts` (storage-side grep guard — see Task J4b)
- Modify: `eslint.config.js:5-46` (add an `import/no-restricted-paths` block scoped to `framework/src/**`)
- Modify: `package.json:38-43` (add `eslint-plugin-import` devDependency)
- Create: `docs/notes/sp1-ci-assertions.md`
- Test: `framework/test/no-native-imports.test.ts`, `storage/test/web-bundle-purity.test.ts`

**Interfaces:**
- Consumes: `node:fs` (`readFileSync`), `node:path`, `node:url` (`fileURLToPath`), a recursive directory walk over `framework/src`; `describe/it/expect` from `vitest`.
- Produces: a source-grep guard asserting `framework/src/**` imports none of `better-sqlite3|expo-sqlite|idb|electron`; consumed by CI as a hard gate.

- [ ] **Step 1: Write the failing test**
```ts
// framework/test/no-native-imports.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

/** Modules core must NEVER import — they belong to @sublime-ui/storage / desktop. */
const FORBIDDEN = ['better-sqlite3', 'expo-sqlite', 'idb', 'electron'];

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...tsFiles(full));
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/** Match `import ... from 'mod'`, `import 'mod'`, and `require('mod')` (mod or mod/...). */
function importsOf(source: string): string[] {
  const specs: string[] = [];
  const re = /(?:import[\s\S]*?from\s*|import\s*|require\s*\(\s*)['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) specs.push(m[1]);
  return specs;
}

describe('core purity — framework/src has no native/RN/DOM-engine imports', () => {
  const files = tsFiles(SRC);

  it('finds source files to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('no framework/src file imports better-sqlite3 / expo-sqlite / idb / electron', () => {
    const violations: string[] = [];
    for (const file of files) {
      const specs = importsOf(readFileSync(file, 'utf8'));
      for (const spec of specs) {
        const base = spec.split('/')[0];
        if (FORBIDDEN.includes(base)) {
          violations.push(`${relative(SRC, file)} imports "${spec}"`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/no-native-imports.test.ts`
Expected: FAIL with `Cannot find module ... no-native-imports` is NOT expected — the file exists; instead it should PASS immediately because core is already pure. To prove the guard actually catches violations (TDD red), temporarily add a line `import 'idb';` to `framework/src/index.ts`, run, and confirm FAIL with `expected [ 'index.ts imports "idb"' ] to deeply equal []`. Then remove that line.
- [ ] **Step 3: Implement — confirm core purity, add the ESLint rule, document the desktop/JSON1 CI assertions**

Remove the temporary `import 'idb';` from `framework/src/index.ts` (the test now guards it). Add the ESLint `import/no-restricted-paths` block to `eslint.config.js` (insert after the test-sources block, before `prettier`):
```js
// eslint.config.js — add `import importPlugin from 'eslint-plugin-import';` at the top,
// then add this config object before `prettier` in the exported array:
  {
    // Core (@sublime-ui/framework src) must stay platform-agnostic: zero native /
    // RN / DOM-engine imports. Those live only in @sublime-ui/storage and
    // @sublime-ui/desktop. Mirrors framework/test/no-native-imports.test.ts.
    files: ['framework/src/**/*.ts'],
    plugins: { import: importPlugin },
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './framework/src',
              from: './node_modules/better-sqlite3',
              message: 'Core must not import better-sqlite3 — it belongs in @sublime-ui/storage.',
            },
          ],
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'better-sqlite3', message: 'Native dep — use @sublime-ui/storage.' },
            { name: 'expo-sqlite', message: 'Native dep — use @sublime-ui/storage.' },
            { name: 'idb', message: 'DOM dep — use @sublime-ui/storage/web.' },
            { name: 'electron', message: 'Desktop dep — use @sublime-ui/desktop.' },
          ],
        },
      ],
    },
  },
```

Add `eslint-plugin-import` to root `package.json` devDependencies (insert alphabetically after `eslint-config-prettier`):
```jsonc
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-import": "^2.31.0",
    "prettier": "^3.3.0",
```

Create `docs/notes/sp1-ci-assertions.md` documenting the two assertions that can only run on a packaged desktop build (vitest source-grep covers the import guard; these two are out-of-band CI steps):
```markdown
# SP1 — CI assertions

Three guards keep the storage-agnostic gateway honest in CI.

## 1. Core purity (automated, in-repo)
`framework/test/no-native-imports.test.ts` greps every `framework/src/**` source
file and fails if any imports `better-sqlite3`, `expo-sqlite`, `idb`, or
`electron`. The ESLint `no-restricted-imports` / `import/no-restricted-paths`
rule on `framework/src/**` (in `eslint.config.js`) is the lint-time mirror. Both
run on every PR via `npm test` and `npm run lint`.

## 2. Packaged-desktop native module (out-of-band, desktop build job)
`better-sqlite3` is a native module and must be unpacked from the asar so the
Electron MAIN process can `require` it at runtime. After a desktop `make`, CI
asserts:

- `app.asar.unpacked/node_modules/better-sqlite3/build/Release/better_sqlite3.node`
  exists in the packaged output (mitigates electron/forge#3934). A shell step:
  ```bash
  test -f "$(find out -path '*app.asar.unpacked*better_sqlite3.node' | head -n1)" \
    || { echo 'better-sqlite3.node missing from app.asar.unpacked'; exit 1; }
  ```
- `better-sqlite3` is marked `external` in the Vite **main** build config (it must
  not be bundled). Assert the string `external` + `better-sqlite3` co-occur in the
  desktop main Vite/forge config, or inspect the build manifest.

These run only in the desktop packaging job (they need a real `make`), not in the
fast unit-test job.

## 3. SQLite JSON1 startup probe (runtime, asserted in storage tests)
The SqliteAdapter runs `SELECT json_extract('{"a":1}','$.a')` on first use and
throws a typed `StorageError` if JSON1 is unavailable. The storage adapter test
suite asserts the probe succeeds against the in-process `better-sqlite3` driver
and that a driver without JSON1 surfaces a `StorageError` — so a JSON1-less SQLite
build fails CI at the storage workspace rather than silently at runtime.
```
- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/no-native-imports.test.ts`
Expected: PASS — `framework/src` contains no forbidden imports (the temporary `import 'idb';` removed); the file-scan finds source files and reports zero violations. Also run `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime && npm install` then `npm run lint` and expect no new errors.
- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add framework/test/no-native-imports.test.ts eslint.config.js package.json package-lock.json docs/notes/sp1-ci-assertions.md && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "test(framework): core-purity import guard + ESLint no-restricted-imports + CI-assertions doc"
```

#### Task J4b: storage web-bundle purity guard (no native SQLite in the web path)

The mirror of the framework core-purity guard, scoped to the storage WEB path:
`storage/src/web.ts` and `storage/src/createDatabaseAdapter.web.ts` must NOT
statically `import ... from 'better-sqlite3'` or `'expo-sqlite'`. The desktop
branch reaches SQLite only through `@sublime-ui/desktop/client` `getNative` (a
renderer-safe proxy) and a type-only `SqliteContract` — never a static native
import — so no native module can leak into a web bundle.

- [ ] **Step 1: Write the failing test**
```ts
// storage/test/web-bundle-purity.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

/** Native SQLite modules that must never enter the web bundle path. */
const FORBIDDEN = ['better-sqlite3', 'expo-sqlite'];

/** Static `import ... from 'mod'` / `import 'mod'` specifiers (not dynamic import()). */
function staticImportsOf(source: string): string[] {
  const specs: string[] = [];
  const re = /(?:^|\n)\s*import\b[\s\S]*?from\s*['"]([^'"]+)['"]|(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) specs.push((m[1] ?? m[2])!);
  return specs;
}

describe('storage web-bundle purity — no static native SQLite import in the web path', () => {
  const webFiles = ['web.ts', 'createDatabaseAdapter.web.ts'];

  for (const file of webFiles) {
    it(`${file} statically imports no better-sqlite3 / expo-sqlite`, () => {
      const specs = staticImportsOf(readFileSync(join(SRC, file), 'utf8'));
      const offenders = specs.filter((s) => FORBIDDEN.includes(s.split('/')[0]!));
      expect(offenders).toEqual([]);
    });
  }
});
```
- [ ] **Step 2: Run the test, verify it fails (TDD red)**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage && npx vitest run test/web-bundle-purity.test.ts`
Expected: PASS immediately because the web path is already pure. To prove the guard catches violations, temporarily add `import 'better-sqlite3';` to `storage/src/web.ts`, run, confirm FAIL with `expected [ 'better-sqlite3' ] to deeply equal []`, then remove it.
- [ ] **Step 3: Implement — confirm purity (no code changes)**
Remove the temporary `import 'better-sqlite3';` from `storage/src/web.ts`. The web path already routes the desktop branch through `getNative` + a type-only `SqliteContract`, so the guard stays green.
- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage && npx vitest run test/web-bundle-purity.test.ts`
Expected: PASS — both web-path files contain no static `better-sqlite3`/`expo-sqlite` import.
- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add storage/test/web-bundle-purity.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "test(storage): web-bundle purity guard — no static native SQLite import in the web path"
```


