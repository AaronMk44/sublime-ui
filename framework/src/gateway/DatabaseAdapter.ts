import type { Query } from './Query.js';
import type { Row, Id } from './Gateway.js';

/**
 * Platform-agnostic document-store port (the Bridge target for DbGateway).
 * Concrete adapters (SQLite, IndexedDB) live OUTSIDE core (@sublime-ui/storage)
 * and are injected via configureSublime({ databaseAdapter }). All methods are
 * async (sync better-sqlite3 calls are wrapped in their adapter), and storage is
 * document-oriented with no schema. Absence -> null / []; a missing id on
 * delete() is a no-op; insert() of a duplicate id throws StorageError; update()
 * of a missing id throws NotFoundError; driver/connection failures throw StorageError.
 */
export interface DatabaseAdapter {
  ensureCollection(resource: string): Promise<void>;
  get(resource: string, id: Id): Promise<Row | null>;
  getAll(resource: string): Promise<Row[]>;
  query(resource: string, query: Query): Promise<Row[]>;
  insert(resource: string, row: Row): Promise<Row>;
  update(resource: string, id: Id, row: Row): Promise<Row>;
  delete(resource: string, id: Id): Promise<void>;
  transaction?<T>(fn: (tx: DatabaseAdapter) => Promise<T>): Promise<T>;
}
