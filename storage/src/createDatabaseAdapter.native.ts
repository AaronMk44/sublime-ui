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
