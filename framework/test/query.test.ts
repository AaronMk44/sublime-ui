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

  it('returns false for a flat field (status) and true for a structured limit (structural contract)', () => {
    expect(isQuery({ status: 'active' })).toBe(false);
    expect(isQuery({ limit: 10 })).toBe(true);
  });

  it('returns false for a mixed object with one non-Query key (e.g. status + limit)', () => {
    expect(isQuery({ status: 'active', limit: 10 })).toBe(false);
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

  it('passes pagination-only input through unchanged (limit + offset, not eq filters)', () => {
    expect(normalizeQuery({ limit: 10, offset: 5 })).toEqual({ limit: 10, offset: 5 });
  });

  it('passes a limit-only Query through unchanged (pagination, not an eq filter)', () => {
    expect(normalizeQuery({ limit: 10 })).toEqual({ limit: 10 });
  });

  it('passes a mixed structured Query (filters + limit) through unchanged', () => {
    const q: Query = {
      filters: [{ field: 'storeId', op: 'eq', value: 7 }],
      limit: 10,
    };
    expect(normalizeQuery(q)).toEqual(q);
  });

  it('requires the explicit structured form to filter on a field named "limit" (legacy form unsupported)', () => {
    // A flat field literally named `limit` cannot be expressed as a legacy record
    // ({ limit: 10 } is pagination); callers must use the explicit filters form.
    const q: Query = { filters: [{ field: 'limit', op: 'eq', value: 10 }] };
    expect(normalizeQuery(q)).toEqual(q);
  });
});
