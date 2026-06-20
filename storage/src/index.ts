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
export { createDesktopSqliteAdapter } from './desktop.js';
