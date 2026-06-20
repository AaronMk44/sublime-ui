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
