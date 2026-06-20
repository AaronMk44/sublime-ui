### Task B1: Query types + normalizeQuery + isQuery

**Files:**
- Create: `framework/src/gateway/Query.ts`
- Test: `framework/test/query.test.ts`

**Interfaces:**
- Consumes: nothing (leaf module — pure types + two pure functions, no framework imports)
- Produces: `type FilterOp = 'eq'|'ne'|'gt'|'gte'|'lt'|'lte'|'in'|'like'`; `type FilterValue = string|number|boolean|null|Array<string|number>`; `interface QueryFilter { field: string; op: FilterOp; value: FilterValue }`; `interface QuerySort { field: string; dir: 'asc'|'desc' }`; `interface Query { filters?: QueryFilter[]; sort?: QuerySort[]; limit?: number; offset?: number }`; `type LegacyQuery = Record<string, string|number|boolean>`; `function normalizeQuery(q?: Query|LegacyQuery): Query|undefined`; `function isQuery(q: unknown): q is Query`

- [ ] **Step 1: Write the failing test**
```ts
import { describe, it, expect } from 'vitest';
import {
  normalizeQuery,
  isQuery,
  type Query,
  type LegacyQuery,
} from '../src/gateway/Query.js';

describe('isQuery', () => {
  it('returns true for a structured Query with filters', () => {
    const q: Query = { filters: [{ field: 'storeId', op: 'eq', value: 7 }] };
    expect(isQuery(q)).toBe(true);
  });

  it('returns true for a structured Query with only sort', () => {
    const q: Query = { sort: [{ field: 'name', dir: 'asc' }] };
    expect(isQuery(q)).toBe(true);
  });

  it('returns true for a structured Query with only limit', () => {
    expect(isQuery({ limit: 10 })).toBe(true);
  });

  it('returns true for a structured Query with only offset', () => {
    expect(isQuery({ offset: 5 })).toBe(true);
  });

  it('returns true for an empty object (treated as empty Query => all rows)', () => {
    expect(isQuery({})).toBe(true);
  });

  it('returns false for a legacy flat record', () => {
    const legacy: LegacyQuery = { storeId: 7 };
    expect(isQuery(legacy)).toBe(false);
  });

  it('returns false for null / undefined / non-objects', () => {
    expect(isQuery(null)).toBe(false);
    expect(isQuery(undefined)).toBe(false);
    expect(isQuery(42)).toBe(false);
    expect(isQuery('storeId')).toBe(false);
  });
});

describe('normalizeQuery', () => {
  it('returns undefined for undefined input', () => {
    expect(normalizeQuery(undefined)).toBeUndefined();
  });

  it('passes a structured Query through unchanged', () => {
    const q: Query = {
      filters: [{ field: 'pinned', op: 'eq', value: true }],
      sort: [{ field: 'title', dir: 'desc' }],
      limit: 5,
      offset: 2,
    };
    expect(normalizeQuery(q)).toEqual(q);
  });

  it('converts a single-key legacy record to an eq filter', () => {
    expect(normalizeQuery({ storeId: 7 })).toEqual({
      filters: [{ field: 'storeId', op: 'eq', value: 7 }],
    });
  });

  it('converts a multi-key legacy record to ANDed eq filters preserving key order', () => {
    expect(normalizeQuery({ storeId: 7, active: true, tier: 'gold' })).toEqual({
      filters: [
        { field: 'storeId', op: 'eq', value: 7 },
        { field: 'active', op: 'eq', value: true },
        { field: 'tier', op: 'eq', value: 'gold' },
      ],
    });
  });

  it('returns an empty Query for an empty legacy record', () => {
    expect(normalizeQuery({})).toEqual({});
  });

  it('treats legacy keys named "limit"/"offset" as eq filters, NOT as pagination (documented unsupported)', () => {
    expect(normalizeQuery({ limit: 10, offset: 5 })).toEqual({
      filters: [
        { field: 'limit', op: 'eq', value: 10 },
        { field: 'offset', op: 'eq', value: 5 },
      ],
    });
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/query.test.ts`
Expected: FAIL with "Failed to resolve import '../src/gateway/Query.js'" (the module does not exist yet)
- [ ] **Step 3: Create `framework/src/gateway/Query.ts` (complete code)**
```ts
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
 */
export function normalizeQuery(q?: Query | LegacyQuery): Query | undefined {
  if (q === undefined) return undefined;
  if (isQuery(q)) return q;
  const legacy = q as LegacyQuery;
  const filters: QueryFilter[] = Object.entries(legacy).map(([field, value]) => ({
    field,
    op: 'eq' as const,
    value,
  }));
  return filters.length > 0 ? { filters } : {};
}
```
- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/query.test.ts`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add framework/src/gateway/Query.ts framework/test/query.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "feat(framework): add backend-neutral Query types + normalizeQuery/isQuery"
```

---

### Task B2: applyQuery (shared JS evaluator)

**Files:**
- Create: `framework/src/gateway/queryMatch.ts`
- Test: `framework/test/queryMatch.test.ts`

**Interfaces:**
- Consumes: `type Query`, `type QueryFilter`, `type FilterOp`, `type FilterValue` from `Query.js`; `type Row = Record<string, unknown>` (declared locally to avoid importing `Gateway.ts`, which does not yet expose `Row` in Phase B; the local alias is structurally identical and will be unified when `Gateway.ts` is rewritten in Phase D)
- Produces: `function applyQuery(rows: Row[], q: Query): Row[]` — filter (AND, per-op) -> stable multi-key sort (nulls first on asc) -> slice(offset, offset+limit) -> defensive clone

- [ ] **Step 1: Write the failing test**
```ts
import { describe, it, expect } from 'vitest';
import { applyQuery } from '../src/gateway/queryMatch.js';
import type { Query } from '../src/gateway/Query.js';

type Row = Record<string, unknown>;

const rows: Row[] = [
  { id: 1, name: 'Alpha', score: 30, tier: 'gold', active: true },
  { id: 2, name: 'beta', score: 10, tier: 'silver', active: false },
  { id: 3, name: 'Gamma', score: 20, tier: 'gold', active: true },
  { id: 4, name: 'delta', score: null, tier: 'bronze', active: false },
  { id: 5, name: 'Alphabet', score: 20, tier: null, active: true },
];

const ids = (out: Row[]): unknown[] => out.map((r) => r.id);

describe('applyQuery — filter operators', () => {
  it('eq matches exact equality', () => {
    const q: Query = { filters: [{ field: 'tier', op: 'eq', value: 'gold' }] };
    expect(ids(applyQuery(rows, q))).toEqual([1, 3]);
  });

  it('eq with null matches only null values', () => {
    const q: Query = { filters: [{ field: 'score', op: 'eq', value: null }] };
    expect(ids(applyQuery(rows, q))).toEqual([4]);
  });

  it('ne excludes exact equality (and excludes rows equal to value)', () => {
    const q: Query = { filters: [{ field: 'tier', op: 'ne', value: 'gold' }] };
    expect(ids(applyQuery(rows, q))).toEqual([2, 4, 5]);
  });

  it('gt compares numerically, skips null', () => {
    const q: Query = { filters: [{ field: 'score', op: 'gt', value: 20 }] };
    expect(ids(applyQuery(rows, q))).toEqual([1]);
  });

  it('gte compares numerically, skips null', () => {
    const q: Query = { filters: [{ field: 'score', op: 'gte', value: 20 }] };
    expect(ids(applyQuery(rows, q))).toEqual([1, 3, 5]);
  });

  it('lt compares numerically, skips null', () => {
    const q: Query = { filters: [{ field: 'score', op: 'lt', value: 20 }] };
    expect(ids(applyQuery(rows, q))).toEqual([2]);
  });

  it('lte compares numerically, skips null', () => {
    const q: Query = { filters: [{ field: 'score', op: 'lte', value: 20 }] };
    expect(ids(applyQuery(rows, q))).toEqual([2, 3, 5]);
  });

  it('in matches array membership', () => {
    const q: Query = { filters: [{ field: 'id', op: 'in', value: [2, 4] }] };
    expect(ids(applyQuery(rows, q))).toEqual([2, 4]);
  });

  it('in with no array value matches nothing', () => {
    const q: Query = { filters: [{ field: 'id', op: 'in', value: 2 }] };
    expect(ids(applyQuery(rows, q))).toEqual([]);
  });

  it('like is case-insensitive contains', () => {
    const q: Query = { filters: [{ field: 'name', op: 'like', value: 'alph' }] };
    expect(ids(applyQuery(rows, q))).toEqual([1, 5]);
  });

  it('like skips null field values', () => {
    const q: Query = { filters: [{ field: 'tier', op: 'like', value: 'o' }] };
    expect(ids(applyQuery(rows, q))).toEqual([1, 3, 2]);
  });

  it('multiple filters are ANDed', () => {
    const q: Query = {
      filters: [
        { field: 'tier', op: 'eq', value: 'gold' },
        { field: 'active', op: 'eq', value: true },
        { field: 'score', op: 'gte', value: 25 },
      ],
    };
    expect(ids(applyQuery(rows, q))).toEqual([1]);
  });
});

describe('applyQuery — sort', () => {
  it('sorts ascending with nulls first', () => {
    const q: Query = { sort: [{ field: 'score', dir: 'asc' }] };
    expect(ids(applyQuery(rows, q))).toEqual([4, 2, 3, 5, 1]);
  });

  it('sorts descending with nulls last', () => {
    const q: Query = { sort: [{ field: 'score', dir: 'desc' }] };
    expect(ids(applyQuery(rows, q))).toEqual([1, 3, 5, 2, 4]);
  });

  it('applies a stable multi-key sort (primary then secondary)', () => {
    const q: Query = {
      sort: [
        { field: 'score', dir: 'asc' },
        { field: 'name', dir: 'asc' },
      ],
    };
    // score asc: 4(null),2(10),then 3&5 tie at 20 -> name asc 'Gamma' vs 'Alphabet'
    // 'Alphabet' < 'Gamma' -> 5 before 3; then 1(30)
    expect(ids(applyQuery(rows, q))).toEqual([4, 2, 5, 3, 1]);
  });

  it('is stable for equal keys (preserves input order)', () => {
    const q: Query = { sort: [{ field: 'tier', dir: 'asc' }] };
    // tier asc, nulls first: null(5), then bronze(4), gold(1,3 in input order), silver(2)
    expect(ids(applyQuery(rows, q))).toEqual([5, 4, 1, 3, 2]);
  });
});

describe('applyQuery — limit/offset', () => {
  it('applies offset then limit', () => {
    const q: Query = { sort: [{ field: 'id', dir: 'asc' }], offset: 1, limit: 2 };
    expect(ids(applyQuery(rows, q))).toEqual([2, 3]);
  });

  it('applies limit alone', () => {
    const q: Query = { sort: [{ field: 'id', dir: 'asc' }], limit: 2 };
    expect(ids(applyQuery(rows, q))).toEqual([1, 2]);
  });

  it('applies offset alone', () => {
    const q: Query = { sort: [{ field: 'id', dir: 'asc' }], offset: 3 };
    expect(ids(applyQuery(rows, q))).toEqual([4, 5]);
  });

  it('an empty Query returns all rows', () => {
    expect(ids(applyQuery(rows, {}))).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('applyQuery — defensive clone', () => {
  it('returns shallow clones so callers cannot mutate the source rows', () => {
    const src: Row[] = [{ id: 1, name: 'x' }];
    const out = applyQuery(src, {});
    expect(out[0]).not.toBe(src[0]);
    expect(out[0]).toEqual(src[0]);
    (out[0] as Row).name = 'mutated';
    expect(src[0]!.name).toBe('x');
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/queryMatch.test.ts`
Expected: FAIL with "Failed to resolve import '../src/gateway/queryMatch.js'" (the module does not exist yet)
- [ ] **Step 3: Create `framework/src/gateway/queryMatch.ts` (complete code)**
```ts
import type { Query, QueryFilter, FilterValue } from './Query.js';

/**
 * Plain serializable row, structurally identical to gateway/Gateway.ts's `Row`.
 * Declared locally so this evaluator stays a leaf module in Phase B (Gateway.ts
 * is rewritten to export `Row` in Phase D; the alias unifies then).
 */
type Row = Record<string, unknown>;

/**
 * The reference query evaluator, shared by InMemoryGateway and the IndexedDB
 * scan fallback so there is ONE operator-semantics oracle. (SP1 design §6.1.)
 * Pipeline: filter (per-op, ANDed) -> stable multi-key sort (nulls first on asc)
 * -> slice(offset, offset+limit) -> defensive shallow clone.
 */
export function applyQuery(rows: Row[], q: Query): Row[] {
  let out = rows;

  if (q.filters && q.filters.length > 0) {
    const filters = q.filters;
    out = out.filter((row) => filters.every((f) => matchFilter(row[f.field], f)));
  }

  if (q.sort && q.sort.length > 0) {
    const sort = q.sort;
    // Decorate-sort-undecorate to keep the sort stable across engines.
    out = out
      .map((row, i) => ({ row, i }))
      .sort((a, b) => {
        for (const s of sort) {
          const cmp = compareValues(a.row[s.field], b.row[s.field], s.dir);
          if (cmp !== 0) return cmp;
        }
        return a.i - b.i; // stable tie-break by original index
      })
      .map((d) => d.row);
  }

  const offset = q.offset ?? 0;
  if (offset > 0 || q.limit !== undefined) {
    const end = q.limit === undefined ? undefined : offset + q.limit;
    out = out.slice(offset, end);
  }

  // Defensive shallow clone so callers cannot mutate the source rows.
  return out.map((row) => ({ ...row }));
}

function matchFilter(actual: unknown, f: QueryFilter): boolean {
  switch (f.op) {
    case 'eq':
      return actual === f.value;
    case 'ne':
      return actual !== f.value;
    case 'gt':
      return isComparable(actual, f.value) && (actual as number) > (f.value as number);
    case 'gte':
      return isComparable(actual, f.value) && (actual as number) >= (f.value as number);
    case 'lt':
      return isComparable(actual, f.value) && (actual as number) < (f.value as number);
    case 'lte':
      return isComparable(actual, f.value) && (actual as number) <= (f.value as number);
    case 'in':
      return Array.isArray(f.value) && f.value.some((v) => v === actual);
    case 'like': {
      if (actual == null || typeof f.value !== 'string') return false;
      return String(actual).toLowerCase().includes(f.value.toLowerCase());
    }
    default:
      return false;
  }
}

/** Ordered comparisons skip nullish operands (mirrors SQL's NULL semantics). */
function isComparable(actual: unknown, value: FilterValue): boolean {
  return actual != null && value != null;
}

/**
 * Three-way compare honoring direction. Nulls sort FIRST on ascending (and
 * therefore LAST on descending, because the whole comparison is negated).
 */
function compareValues(a: unknown, b: unknown, dir: 'asc' | 'desc'): number {
  const an = a == null;
  const bn = b == null;
  if (an && bn) return 0;
  if (an) return dir === 'asc' ? -1 : 1; // null first on asc
  if (bn) return dir === 'asc' ? 1 : -1;

  let base: number;
  if (typeof a === 'number' && typeof b === 'number') {
    base = a < b ? -1 : a > b ? 1 : 0;
  } else {
    const as = String(a);
    const bs = String(b);
    base = as < bs ? -1 : as > bs ? 1 : 0;
  }
  return dir === 'asc' ? base : -base;
}
```
- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/queryMatch.test.ts`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add framework/src/gateway/queryMatch.ts framework/test/queryMatch.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "feat(framework): add shared applyQuery evaluator (filter/sort/limit/offset)"
```

---

### Task B3: toQueryString (REST serializer) — creates HttpGateway.ts skeleton

**Files:**
- Create: `framework/src/gateway/HttpGateway.ts`
- Test: `framework/test/toQueryString.test.ts`

**Interfaces:**
- Consumes: `type Query`, `type QueryFilter`, `type QuerySort` from `Query.js`
- Produces: `function toQueryString(q?: Query): string` — leading `?` when non-empty, `''` when empty/undefined; `eq` scalar -> flat `field=value`; non-`eq` -> `filter[field][op]=value`; `in` -> repeated `filter[field][in]=v`; `sort` -> `sort=field` / `sort=-field` (joined comma); flat `limit`/`offset`; `encodeURIComponent` on keys and values exactly as today's `Gateway.index()`

> **Phasing note:** `HttpGateway.ts` is the home of the refactored REST class, which is authored in **Phase D**. In Phase B we create the file with ONLY the `toQueryString` export (the query serializer the class will use). Phase D adds the `HttpGateway` class to this same file and imports `toQueryString` locally — it must NOT recreate or move this function. This preserves today's `Gateway.index()` flat serialization (`?storeId=7`) which the legacy `Gateway.test.ts:47-51` asserts and which migrates into the `HttpGateway` URL assertions in Phase D.

- [ ] **Step 1: Write the failing test**
```ts
import { describe, it, expect } from 'vitest';
import { toQueryString } from '../src/gateway/HttpGateway.js';
import type { Query } from '../src/gateway/Query.js';

describe('toQueryString', () => {
  it('returns "" for undefined', () => {
    expect(toQueryString(undefined)).toBe('');
  });

  it('returns "" for an empty Query', () => {
    expect(toQueryString({})).toBe('');
  });

  it('serializes a single eq scalar as flat field=value (preserves today\'s ?storeId=7)', () => {
    const q: Query = { filters: [{ field: 'storeId', op: 'eq', value: 7 }] };
    expect(toQueryString(q)).toBe('?storeId=7');
  });

  it('serializes multiple eq scalars as ANDed flat params', () => {
    const q: Query = {
      filters: [
        { field: 'storeId', op: 'eq', value: 7 },
        { field: 'active', op: 'eq', value: true },
      ],
    };
    expect(toQueryString(q)).toBe('?storeId=7&active=true');
  });

  it('serializes a non-eq op as filter[field][op]=value', () => {
    const q: Query = { filters: [{ field: 'score', op: 'gte', value: 20 }] };
    expect(toQueryString(q)).toBe('?filter%5Bscore%5D%5Bgte%5D=20');
  });

  it('serializes like as filter[field][like]=value', () => {
    const q: Query = { filters: [{ field: 'name', op: 'like', value: 'al' }] };
    expect(toQueryString(q)).toBe('?filter%5Bname%5D%5Blike%5D=al');
  });

  it('serializes in as repeated filter[field][in] keys', () => {
    const q: Query = { filters: [{ field: 'id', op: 'in', value: [2, 4] }] };
    expect(toQueryString(q)).toBe('?filter%5Bid%5D%5Bin%5D=2&filter%5Bid%5D%5Bin%5D=4');
  });

  it('serializes ascending sort as sort=field', () => {
    const q: Query = { sort: [{ field: 'name', dir: 'asc' }] };
    expect(toQueryString(q)).toBe('?sort=name');
  });

  it('serializes descending sort as sort=-field', () => {
    const q: Query = { sort: [{ field: 'name', dir: 'desc' }] };
    expect(toQueryString(q)).toBe('?sort=-name');
  });

  it('joins a multi-key sort with commas in order', () => {
    const q: Query = {
      sort: [
        { field: 'score', dir: 'desc' },
        { field: 'name', dir: 'asc' },
      ],
    };
    expect(toQueryString(q)).toBe('?sort=-score%2Cname');
  });

  it('serializes flat limit and offset', () => {
    const q: Query = { limit: 10, offset: 20 };
    expect(toQueryString(q)).toBe('?limit=10&offset=20');
  });

  it('combines filters, sort, limit, and offset in order', () => {
    const q: Query = {
      filters: [
        { field: 'storeId', op: 'eq', value: 7 },
        { field: 'score', op: 'gt', value: 5 },
      ],
      sort: [{ field: 'name', dir: 'asc' }],
      limit: 10,
      offset: 0,
    };
    expect(toQueryString(q)).toBe(
      '?storeId=7&filter%5Bscore%5D%5Bgt%5D=5&sort=name&limit=10&offset=0',
    );
  });

  it('encodeURIComponents keys and values', () => {
    const q: Query = { filters: [{ field: 'q', op: 'eq', value: 'a b&c' }] };
    expect(toQueryString(q)).toBe('?q=a%20b%26c');
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/toQueryString.test.ts`
Expected: FAIL with "Failed to resolve import '../src/gateway/HttpGateway.js'" (the file does not exist yet)
- [ ] **Step 3: Create `framework/src/gateway/HttpGateway.ts` (complete code — Phase B authors ONLY `toQueryString`; Phase D adds the class below it)**
```ts
import type { Query, QueryFilter, QuerySort } from './Query.js';

// NOTE: The HttpGateway class is added to this file in Phase D and imports the
// toQueryString helper below. Phase D must NOT recreate or move this function.

const enc = encodeURIComponent;

/**
 * Serialize a Query into a REST query string (with a leading '?', or '' when
 * empty). Mirrors today's flat scalar form so existing endpoints are unchanged
 * (SP1 design §6.1):
 *   - eq scalar           -> field=value          (preserves today's ?storeId=7)
 *   - any other op        -> filter[field][op]=value
 *   - in                  -> repeated filter[field][in]=value keys
 *   - sort                -> sort=field / sort=-field (comma-joined, in order)
 *   - limit / offset      -> flat limit=/offset=
 * Keys and values are encodeURIComponent'd exactly as the legacy Gateway.index().
 */
export function toQueryString(q?: Query): string {
  if (!q) return '';
  const parts: string[] = [];

  if (q.filters) {
    for (const f of q.filters) parts.push(...serializeFilter(f));
  }

  if (q.sort && q.sort.length > 0) {
    parts.push(`sort=${enc(q.sort.map(sortToken).join(','))}`);
  }

  if (q.limit !== undefined) parts.push(`limit=${enc(String(q.limit))}`);
  if (q.offset !== undefined) parts.push(`offset=${enc(String(q.offset))}`);

  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

function serializeFilter(f: QueryFilter): string[] {
  if (f.op === 'eq') {
    // Flat scalar form — preserves today's ?field=value.
    return [`${enc(f.field)}=${enc(String(f.value))}`];
  }
  if (f.op === 'in') {
    const values = Array.isArray(f.value) ? f.value : [];
    return values.map((v) => `${filterKey(f.field, 'in')}=${enc(String(v))}`);
  }
  return [`${filterKey(f.field, f.op)}=${enc(String(f.value))}`];
}

/** filter[field][op] with encoded brackets, e.g. filter%5Bscore%5D%5Bgte%5D. */
function filterKey(field: string, op: string): string {
  return `filter%5B${enc(field)}%5D%5B${op}%5D`;
}

function sortToken(s: QuerySort): string {
  return s.dir === 'desc' ? `-${s.field}` : s.field;
}
```
- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/toQueryString.test.ts`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add framework/src/gateway/HttpGateway.ts framework/test/toQueryString.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "feat(framework): add toQueryString REST serializer (eq flat, non-eq filter[][])"
```
