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
