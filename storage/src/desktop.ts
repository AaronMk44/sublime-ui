/**
 * Desktop SQLite plumbing for `@sublime-ui/storage`.
 *
 * On desktop the web bundle runs inside the Electron renderer, where the
 * `@sublime-ui/desktop` native bridge exposes a built-in `sqlite` service backed
 * by `better-sqlite3` in the MAIN process. This module adapts that service's
 * renderer-safe proxy (reached hook-free via `getNative('sqlite')`) to the
 * platform-agnostic {@link SqliteDriver} port, which feeds the shared
 * {@link SqliteAdapter}. No native module is imported here — only the type-only
 * {@link SqliteContract} — so this file is safe in the web/renderer graph.
 *
 * Transactions are intentionally NOT implemented in SP1 (the driver omits `tx`),
 * so `DbGateway` falls back to sequential awaits; a future `sqlite.batch()` over
 * one IPC adds it.
 */

import { getNative } from '@sublime-ui/desktop/client';
import { SqliteAdapter } from './sqlite/SqliteAdapter.js';
import type { SqliteDriver } from './sqlite/SqliteDriver.js';
import type { SqliteContract } from '@sublime-ui/desktop/sqlite-contract';

/**
 * Build a {@link SqliteDriver} backed by the desktop `sqlite` native proxy.
 *
 * @returns the driver, or `null` when no native bridge is present (plain web).
 */
export function createDesktopSqliteDriver(): SqliteDriver | null {
  const native = getNative<SqliteContract>('sqlite');
  if (native === null) {
    return null;
  }
  return {
    exec: (sql) => native.exec(sql),
    run: (sql, params) => native.run(sql, params),
    all: (sql, params) => native.all(sql, params),
    get: (sql, params) => native.get(sql, params),
    // `tx` deliberately omitted: desktop defers multi-statement transactions (SP1).
  };
}

/**
 * Build a {@link SqliteAdapter} over the desktop SQLite driver.
 *
 * @throws if no native bridge is present — callers must detect the bridge first
 * (see `createDatabaseAdapter.web.ts`); this is the SQLite-over-IPC branch.
 */
export function createDesktopSqliteAdapter(): SqliteAdapter {
  const driver = createDesktopSqliteDriver();
  if (driver === null) {
    throw new Error(
      'createDesktopSqliteAdapter: no @sublime-ui/desktop native bridge detected; ' +
        'use createDatabaseAdapter() which falls back to IndexedDB on plain web.',
    );
  }
  return new SqliteAdapter(driver);
}
