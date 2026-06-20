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
