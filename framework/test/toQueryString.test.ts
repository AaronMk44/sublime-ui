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
