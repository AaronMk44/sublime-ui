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
