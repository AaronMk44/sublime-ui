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
