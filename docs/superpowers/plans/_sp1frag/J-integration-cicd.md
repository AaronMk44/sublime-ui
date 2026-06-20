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
- Modify: `eslint.config.js:5-46` (add an `import/no-restricted-paths` block scoped to `framework/src/**`)
- Modify: `package.json:38-43` (add `eslint-plugin-import` devDependency)
- Create: `docs/notes/sp1-ci-assertions.md`
- Test: `framework/test/no-native-imports.test.ts`

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
