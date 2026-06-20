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
import { describe, it, expect } from 'vitest';
import { registerModel } from '../src/register.js';
import { modelRegistry } from '../src/discovery/modelRegistry.js';
import { store } from '../src/store/store.js';
import { InMemoryGateway } from '../src/gateway/InMemoryGateway.js';
import { HttpGateway } from '../src/gateway/HttpGateway.js';

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
