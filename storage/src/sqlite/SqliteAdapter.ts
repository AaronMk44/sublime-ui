import {
  NotFoundError,
  StorageError,
  type DatabaseAdapter,
  type Id,
  type Query,
  type Row,
} from '@sublime-ui/framework';
import { buildSelect, ident } from './buildSelect.js';
import type { SqliteDriver } from './SqliteDriver.js';

const ID_KEY = 'id';

/**
 * One platform-agnostic DatabaseAdapter over a `SqliteDriver` (SP1 §7.2).
 * Document storage: `CREATE TABLE IF NOT EXISTS "<resource>" (id TEXT PRIMARY
 * KEY, doc TEXT NOT NULL)`. The PK is the `id` JSON field stringified; queries
 * go through `buildSelect` (json_extract). On first use it runs a JSON1
 * capability probe and throws StorageError if absent. Table names are validated
 * via `ident`; field paths/values are bound (no injection).
 */
export class SqliteAdapter implements DatabaseAdapter {
  private readonly created = new Set<string>();
  private probed = false;

  constructor(private readonly driver: SqliteDriver) {}

  async ensureCollection(resource: string): Promise<void> {
    if (this.created.has(resource)) return;
    await this.probeJson1();
    const table = ident(resource); // throws on an invalid name
    await this.driver.exec(
      `CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, doc TEXT NOT NULL)`,
    );
    this.created.add(resource);
  }

  async get(resource: string, id: Id): Promise<Row | null> {
    const table = ident(resource);
    const row = await this.driver.get(`SELECT doc FROM ${table} WHERE id = ?`, [String(id)]);
    return row ? (JSON.parse(row.doc) as Row) : null;
  }

  async getAll(resource: string): Promise<Row[]> {
    const table = ident(resource);
    const rows = await this.driver.all(`SELECT doc FROM ${table}`, []);
    return rows.map((r) => JSON.parse(r.doc) as Row);
  }

  async query(resource: string, query: Query): Promise<Row[]> {
    const { sql, params } = buildSelect(resource, query);
    const rows = await this.driver.all(sql, params);
    return rows.map((r) => JSON.parse(r.doc) as Row);
  }

  async insert(resource: string, row: Row): Promise<Row> {
    const table = ident(resource);
    const id = String(row[ID_KEY]);
    try {
      await this.driver.run(`INSERT INTO ${table} (id, doc) VALUES (?, ?)`, [
        id,
        JSON.stringify(row),
      ]);
    } catch (e) {
      throw new StorageError(`Failed to insert into "${resource}" (duplicate id ${id}?)`, {
        cause: e,
      });
    }
    return { ...row };
  }

  async update(resource: string, id: Id, row: Row): Promise<Row> {
    const current = await this.get(resource, id);
    if (current === null) {
      throw new NotFoundError(`${resource}#${String(id)} not found`, { resource, id });
    }
    const merged: Row = { ...current, ...row, [ID_KEY]: current[ID_KEY] };
    const table = ident(resource);
    const info = await this.driver.run(`UPDATE ${table} SET doc = ? WHERE id = ?`, [
      JSON.stringify(merged),
      String(id),
    ]);
    if (info.changes === 0) {
      throw new NotFoundError(`${resource}#${String(id)} not found`, { resource, id });
    }
    return { ...merged };
  }

  async delete(resource: string, id: Id): Promise<void> {
    const table = ident(resource);
    // No-op when the row is absent (changes === 0 is fine).
    await this.driver.run(`DELETE FROM ${table} WHERE id = ?`, [String(id)]);
  }

  /** One-time JSON1 capability probe (SP1 §7.2): SELECT json_extract('{"a":1}','$.a'). */
  private async probeJson1(): Promise<void> {
    if (this.probed) return;
    try {
      await this.driver.get("SELECT json_extract('{\"a\":1}', '$.a') AS v", []);
    } catch (e) {
      throw new StorageError('SQLite JSON1 extension is unavailable (json_extract failed)', {
        cause: e,
      });
    }
    this.probed = true;
  }
}
