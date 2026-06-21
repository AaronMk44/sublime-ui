import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { NotFoundError, StorageError, type FilterValue } from '@sublime-ui/framework';
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
let db: InstanceType<typeof Database>;

beforeEach(() => {
  db = new Database(':memory:');
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

describe('SqliteAdapter — boolean filter binding', () => {
  // Regression: a raw JS boolean cannot be bound by better-sqlite3 ("can only
  // bind numbers, strings, bigints, buffers, and null"). Rows are stored as
  // JSON.stringify(row), so a boolean field reads back as INTEGER 1/0 via
  // json_extract; buildSelect must coerce true->1 / false->0 at the bind site.
  beforeEach(async () => {
    await adapter.ensureCollection('notes');
    await adapter.insert('notes', { id: 'n1', title: 'A', flag: true });
    await adapter.insert('notes', { id: 'n2', title: 'B', flag: false });
    await adapter.insert('notes', { id: 'n3', title: 'C', flag: true });
  });

  it('eq true matches only the truthy rows', async () => {
    const out = await adapter.query('notes', {
      filters: [{ field: 'flag', op: 'eq', value: true }],
    });
    expect(out.map((r) => r.id).sort()).toEqual(['n1', 'n3']);
  });

  it('eq false matches only the falsy rows', async () => {
    const out = await adapter.query('notes', {
      filters: [{ field: 'flag', op: 'eq', value: false }],
    });
    expect(out.map((r) => r.id)).toEqual(['n2']);
  });

  it('ne true matches the falsy rows', async () => {
    const out = await adapter.query('notes', {
      filters: [{ field: 'flag', op: 'ne', value: true }],
    });
    expect(out.map((r) => r.id)).toEqual(['n2']);
  });

  it('in with booleans matches by membership', async () => {
    // `FilterValue` types `in` arrays as `Array<string | number>`, but rows are
    // `Record<string, unknown>` and `buildSelect`'s `bindable` coerces boolean
    // members at the bind site (true->1 / false->0), so a boolean `in` list is
    // genuinely supported at runtime. The framework type cannot express a boolean
    // array member, so widen the local literal at the boundary — data and the
    // assertion below are unchanged; this still exercises the boolean filter.
    const value = [false] as unknown as FilterValue;
    const out = await adapter.query('notes', {
      filters: [{ field: 'flag', op: 'in', value }],
    });
    expect(out.map((r) => r.id)).toEqual(['n2']);
  });

  it('two filters ANDed, one boolean, agrees', async () => {
    const out = await adapter.query('notes', {
      filters: [
        { field: 'title', op: 'eq', value: 'A' },
        { field: 'flag', op: 'eq', value: true },
      ],
    });
    expect(out.map((r) => r.id)).toEqual(['n1']);
  });
});

describe('SqliteAdapter — safety', () => {
  it('rejects an injection in the resource/table name', async () => {
    await expect(adapter.ensureCollection('notes; DROP TABLE x')).rejects.toThrow();
  });

  it('rejects other invalid resource names (a-b, 1bad, a space, lone /)', async () => {
    await expect(adapter.ensureCollection('a-b')).rejects.toThrow();
    await expect(adapter.ensureCollection('1bad')).rejects.toThrow();
    await expect(adapter.ensureCollection('has space')).rejects.toThrow();
    await expect(adapter.ensureCollection('/')).rejects.toThrow();
  });
});

describe('SqliteAdapter — slash-prefixed resource', () => {
  it('a "/notes" resource round-trips end-to-end, stored in table "notes"', async () => {
    // The conventional REST resource form is slash-prefixed; ident() strips it.
    await adapter.ensureCollection('/notes');
    const created = await adapter.insert('/notes', { id: 'n1', title: 'Hello', pinned: true });
    expect(created).toEqual({ id: 'n1', title: 'Hello', pinned: true });
    expect(await adapter.get('/notes', 'n1')).toEqual({ id: 'n1', title: 'Hello', pinned: true });

    // The row physically lives in the un-prefixed table "notes".
    const raw = db.prepare('SELECT doc FROM "notes" WHERE id = ?').get('n1') as { doc: string };
    expect(JSON.parse(raw.doc)).toEqual({ id: 'n1', title: 'Hello', pinned: true });

    // update / query / delete also resolve to the same table.
    await adapter.update('/notes', 'n1', { title: 'Hi' });
    const queried = await adapter.query('/notes', {
      filters: [{ field: 'title', op: 'eq', value: 'Hi' }],
    });
    expect(queried.map((r) => r.id)).toEqual(['n1']);
    await adapter.delete('/notes', 'n1');
    expect(await adapter.get('/notes', 'n1')).toBeNull();
  });
});

describe('SqliteAdapter — self-creates table on first op (no explicit ensureCollection)', () => {
  // Regression: DbGateway never calls ensureCollection on its read path, and
  // registerModel only fires it as a fire-and-forget `void`. On the IndexedDB
  // adapter the store is created when the DB opens (collect-then-open), so a
  // first read never races. On SQLite the un-awaited CREATE TABLE raced the
  // first `rxAll()` read → "no such table: todos" on mobile. Each op must
  // self-heal by ensuring the table first (idempotent via the `created` Set).
  it('getAll on a never-ensured resource returns [] instead of throwing', async () => {
    expect(await adapter.getAll('todos')).toEqual([]);
  });

  it('query on a never-ensured resource returns [] instead of throwing', async () => {
    expect(await adapter.query('todos', {})).toEqual([]);
  });

  it('get on a never-ensured resource returns null instead of throwing', async () => {
    expect(await adapter.get('todos', 'missing')).toBeNull();
  });

  it('insert on a never-ensured resource creates the table and round-trips', async () => {
    const created = await adapter.insert('todos', { id: 't1', title: 'A', done: false });
    expect(created).toEqual({ id: 't1', title: 'A', done: false });
    expect(await adapter.get('todos', 't1')).toEqual({ id: 't1', title: 'A', done: false });
  });

  it('delete on a never-ensured resource is a no-op (does not throw)', async () => {
    await expect(adapter.delete('todos', 'nope')).resolves.toBeUndefined();
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
