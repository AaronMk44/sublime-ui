import type { Query } from './Query.js';
import type { RequestConfig } from './http.js';

/** A plain serializable JSON row, exactly as stored in a model's Redux slice. */
export type Row = Record<string, unknown>;

/** A primary-key value. In-memory/DB generate string UUIDs; HTTP often numeric. */
export type Id = string | number;

/**
 * Storage-strategy contract. Every method returns RAW data (no ApiResponse
 * envelope) and THROWS a typed DataError on real failure. Absence is NOT a
 * failure: show() returns null for a record that legitimately does not exist.
 * All methods are async on every strategy (sync better-sqlite3 is wrapped),
 * so Model never branches on transport.
 */
export interface Gateway {
  index(query?: Query): Promise<Row[]>;
  show(id: Id): Promise<Row | null>;
  create(body: Row): Promise<Row>;
  update(id: Id, body: Row): Promise<Row>;
  destroy(id: Id): Promise<void>;
}

/** REST-only escape hatch for custom endpoints (Model.call). HttpGateway only. */
export interface RequestCapableGateway extends Gateway {
  request<T>(config: RequestConfig): Promise<T>;
}

/** Runtime type guard: true iff the gateway exposes request() (i.e. HttpGateway). */
export function isRequestCapable(g: Gateway): g is RequestCapableGateway {
  return typeof (g as Partial<RequestCapableGateway>).request === 'function';
}
