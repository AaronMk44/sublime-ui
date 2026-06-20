import type { Query, Row } from '@sublime-ui/framework';

/**
 * A single shared dataset every backend is loaded with before running the cases.
 * Plain serializable rows (string ids — the UUID/PK convention) with a mix of
 * string / number / boolean / null fields so every FilterOp is exercised.
 */
export const conformanceRows: Row[] = [
  { id: 'a', name: 'Alpha',  qty: 10, active: true,  tag: 'red',   note: null },
  { id: 'b', name: 'bravo',  qty: 20, active: false, tag: 'green', note: 'hello world' },
  { id: 'c', name: 'Cobra',  qty: 30, active: true,  tag: 'blue',  note: 'WORLD peace' },
  { id: 'd', name: 'delta',  qty: 20, active: true,  tag: 'red',   note: 'other' },
  { id: 'e', name: 'Echo',   qty: 40, active: false, tag: 'green', note: null },
];

export const conformanceCases: {
  name: string;
  query: Query;
  /** Ids in the EXACT order the backend must return them (sort-sensitive). */
  expectedIds: Array<string | number>;
}[] = [
  { name: 'empty query -> all rows (insertion order)',
    query: {}, expectedIds: ['a', 'b', 'c', 'd', 'e'] },

  { name: 'eq string',
    query: { filters: [{ field: 'tag', op: 'eq', value: 'red' }] },
    expectedIds: ['a', 'd'] },

  { name: 'ne string',
    query: { filters: [{ field: 'tag', op: 'ne', value: 'red' }] },
    expectedIds: ['b', 'c', 'e'] },

  { name: 'eq boolean true',
    query: { filters: [{ field: 'active', op: 'eq', value: true }] },
    expectedIds: ['a', 'c', 'd'] },

  { name: 'gt number',
    query: { filters: [{ field: 'qty', op: 'gt', value: 20 }] },
    expectedIds: ['c', 'e'] },

  { name: 'gte number',
    query: { filters: [{ field: 'qty', op: 'gte', value: 20 }] },
    expectedIds: ['b', 'c', 'd', 'e'] },

  { name: 'lt number',
    query: { filters: [{ field: 'qty', op: 'lt', value: 30 }] },
    expectedIds: ['a', 'b', 'd'] },

  { name: 'lte number',
    query: { filters: [{ field: 'qty', op: 'lte', value: 20 }] },
    expectedIds: ['a', 'b', 'd'] },

  { name: 'in number list',
    query: { filters: [{ field: 'qty', op: 'in', value: [10, 40] }] },
    expectedIds: ['a', 'e'] },

  { name: 'in string list',
    query: { filters: [{ field: 'tag', op: 'in', value: ['blue', 'green'] }] },
    expectedIds: ['b', 'c', 'e'] },

  { name: 'like is case-insensitive contains',
    query: { filters: [{ field: 'note', op: 'like', value: 'world' }] },
    expectedIds: ['b', 'c'] },

  { name: 'eq null matches only null notes',
    query: { filters: [{ field: 'note', op: 'eq', value: null }] },
    expectedIds: ['a', 'e'] },

  { name: 'two filters ANDed',
    query: { filters: [
      { field: 'tag', op: 'eq', value: 'red' },
      { field: 'active', op: 'eq', value: true },
    ] },
    expectedIds: ['a', 'd'] },

  // NOTE (J1 fixture correction): nulls first on asc, then non-null notes ordered
  // by BINARY/byte collation, which BOTH the JS `applyQuery` oracle AND SQLite's
  // default ORDER BY agree on: 'WORLD peace' (W=0x57) < 'hello world' (h=0x68) <
  // 'other' (o=0x6F). So the conformant order is a,e (null,null), c,b,d. The
  // brief's draft value ['a','e','b','d','c'] mis-ordered the non-null tail; all
  // three backends DISAGREED with it but AGREE with each other (no divergence).
  { name: 'sort asc with nulls first',
    query: { sort: [{ field: 'note', dir: 'asc' }] },
    expectedIds: ['a', 'e', 'c', 'b', 'd'] },

  { name: 'multi-key sort (qty asc, name asc) then limit/offset',
    query: { sort: [{ field: 'qty', dir: 'asc' }, { field: 'name', dir: 'asc' }],
             limit: 2, offset: 1 },
    expectedIds: ['b', 'd'] },
];
