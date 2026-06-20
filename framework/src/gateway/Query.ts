/**
 * Backend-neutral query object, consumed by InMemoryGateway + DbGateway and
 * serialized for REST. Pure types + two pure helpers — ZERO framework/native/DOM
 * imports. (SP1 design §6.1.)
 */

export type FilterOp = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like';

export type FilterValue = string | number | boolean | null | Array<string | number>;

/** A single ANDed predicate. For op 'in', `value` is an array. */
export interface QueryFilter {
  field: string;
  op: FilterOp;
  value: FilterValue;
}

export interface QuerySort {
  field: string;
  dir: 'asc' | 'desc';
}

/** All fields optional; an empty Query ({}) means "all rows". */
export interface Query {
  filters?: QueryFilter[]; // ANDed (no OR/grouping in v1 — reserved)
  sort?: QuerySort[]; // applied primary, secondary, …
  limit?: number; // forward-compat for SP5 pagination
  offset?: number;
}

/**
 * Today's flat form (`{ storeId: 7 }`). Each entry becomes an `eq` filter.
 * NOTE: a legacy key literally named `limit` or `offset` is treated as an `eq`
 * FILTER on that field, NOT as pagination — pagination is only reachable through
 * the structured Query. This is documented as unsupported for the legacy form.
 */
export type LegacyQuery = Record<string, string | number | boolean>;

/**
 * Structural discriminator: a value is a structured Query iff it is a plain
 * object whose only own keys are a subset of { filters, sort, limit, offset }.
 * An empty object is a valid (empty) Query. A flat legacy record with arbitrary
 * field keys is NOT a Query.
 */
export function isQuery(q: unknown): q is Query {
  if (q === null || typeof q !== 'object' || Array.isArray(q)) return false;
  const allowed = new Set(['filters', 'sort', 'limit', 'offset']);
  for (const k of Object.keys(q as Record<string, unknown>)) {
    if (!allowed.has(k)) return false;
  }
  return true;
}

/**
 * Normalize either a structured Query or a legacy flat record into a Query.
 * - undefined -> undefined
 * - a structured Query -> returned as-is
 * - a legacy record -> { filters: [{ field, op: 'eq', value }] } in key order;
 *   an empty record -> {} (the empty Query).
 *
 * Disambiguation note: `{ limit }` / `{ offset }` are valid *shapes* for both a
 * structured Query and a legacy record. `isQuery` (a pure structural test) calls
 * them Queries, but for the legacy form the brief specifies they must become `eq`
 * filters (pagination is reachable only via the structured Query). So here we
 * short-circuit as a structured Query only when the unambiguous container keys
 * `filters`/`sort` are present, or when the object is empty (the empty Query).
 */
export function normalizeQuery(q?: Query | LegacyQuery): Query | undefined {
  if (q === undefined) return undefined;
  if (isQuery(q)) {
    const keys = Object.keys(q);
    // Empty object, or carries an unambiguous container key -> already a Query.
    if (keys.length === 0 || keys.includes('filters') || keys.includes('sort')) {
      return q;
    }
    // Otherwise the only keys are `limit`/`offset` with scalar values, which is
    // an ambiguous shape; the legacy form requires they become `eq` filters.
  }
  const legacy = q as LegacyQuery;
  const filters: QueryFilter[] = Object.entries(legacy).map(([field, value]) => ({
    field,
    op: 'eq' as const,
    value,
  }));
  return filters.length > 0 ? { filters } : {};
}
