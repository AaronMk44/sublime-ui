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
