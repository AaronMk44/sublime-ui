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
