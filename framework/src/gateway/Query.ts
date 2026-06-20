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
 *
 * UNSUPPORTED EDGE: a flat field literally named `filters`, `sort`, `limit`, or
 * `offset` cannot be expressed in this legacy form — the structural rule (see
 * `isQuery` / `normalizeQuery`) classifies any object whose keys are all in
 * { filters, sort, limit, offset } as a structured Query and passes it through,
 * so `{ limit: 10 }` is pagination, not an `eq` filter on a field called "limit".
 * To filter on such a field, callers MUST use the explicit structured form, e.g.
 * `{ filters: [{ field: 'limit', op: 'eq', value: 10 }] }`.
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
 * Defers entirely to the STRUCTURAL rule (`isQuery`):
 * - undefined / null -> undefined
 * - if EVERY own enumerable key is in { filters, sort, limit, offset } it is a
 *   structured Query and is returned as-is (preserving filters/sort/limit/offset).
 *   This includes the empty object {} (the empty Query => all rows) and
 *   pagination-only inputs like `{ limit: 10 }` / `{ limit: 10, offset: 5 }`.
 * - otherwise it is a legacy flat record -> { filters: [{ field, op: 'eq', value }] }
 *   in key order.
 *
 * UNSUPPORTED EDGE (documented on `LegacyQuery`): a flat field literally named
 * `filters`/`sort`/`limit`/`offset` is NOT reachable via the legacy form — such
 * an object is classified as a structured Query and passes through. Callers must
 * use the explicit form, e.g. `{ filters: [{ field: 'limit', op: 'eq', value: 10 }] }`.
 */
export function normalizeQuery(q?: Query | LegacyQuery): Query | undefined {
  if (q === undefined || q === null) return undefined;
  // Structural passthrough: empty {} and any object whose keys are all structured
  // Query keys (filters/sort/limit/offset) are returned unchanged.
  if (isQuery(q)) return q;
  const legacy = q as LegacyQuery;
  const filters: QueryFilter[] = Object.entries(legacy).map(([field, value]) => ({
    field,
    op: 'eq' as const,
    value,
  }));
  return { filters };
}
