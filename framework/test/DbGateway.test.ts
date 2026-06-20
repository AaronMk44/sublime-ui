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
