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
