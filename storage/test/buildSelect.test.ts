import { describe, it, expect } from 'vitest';
import { buildSelect, ident } from '../src/sqlite/buildSelect.js';
import type { Query } from '@sublime-ui/framework';

describe('ident', () => {
  it('accepts a valid table name', () => {
    expect(ident('notes')).toBe('"notes"');
    expect(ident('_x9')).toBe('"_x9"');
  });

  it('rejects an invalid table name', () => {
    expect(() => ident('notes; DROP TABLE x')).toThrow();
    expect(() => ident('1bad')).toThrow();
    expect(() => ident('has space')).toThrow();
    expect(() => ident('')).toThrow();
  });
});

describe('buildSelect', () => {
  it('selects all when the query is empty', () => {
    const { sql, params } = buildSelect('notes', {});
    expect(sql).toBe('SELECT doc FROM "notes"');
    expect(params).toEqual([]);
  });

  it('eq scalar -> json_extract(doc,?) = ?', () => {
    const q: Query = { filters: [{ field: 'tier', op: 'eq', value: 'gold' }] };
    const { sql, params } = buildSelect('notes', q);
    expect(sql).toBe("SELECT doc FROM \"notes\" WHERE json_extract(doc, ?) = ?");
    expect(params).toEqual(['$.tier', 'gold']);
  });

  it('eq null -> json_extract(doc,?) IS NULL (no value param)', () => {
    const q: Query = { filters: [{ field: 'score', op: 'eq', value: null }] };
    const { sql, params } = buildSelect('notes', q);
    expect(sql).toBe("SELECT doc FROM \"notes\" WHERE json_extract(doc, ?) IS NULL");
    expect(params).toEqual(['$.score']);
  });

  it('ne -> <>', () => {
    const q: Query = { filters: [{ field: 'tier', op: 'ne', value: 'gold' }] };
    const { sql, params } = buildSelect('notes', q);
    expect(sql).toBe("SELECT doc FROM \"notes\" WHERE json_extract(doc, ?) <> ?");
    expect(params).toEqual(['$.tier', 'gold']);
  });

  it('comparison ops -> >, >=, <, <=', () => {
    expect(buildSelect('t', { filters: [{ field: 's', op: 'gt', value: 1 }] }).sql).toContain('json_extract(doc, ?) > ?');
    expect(buildSelect('t', { filters: [{ field: 's', op: 'gte', value: 1 }] }).sql).toContain('json_extract(doc, ?) >= ?');
    expect(buildSelect('t', { filters: [{ field: 's', op: 'lt', value: 1 }] }).sql).toContain('json_extract(doc, ?) < ?');
    expect(buildSelect('t', { filters: [{ field: 's', op: 'lte', value: 1 }] }).sql).toContain('json_extract(doc, ?) <= ?');
  });

  it('in -> IN (?, ?) with one value param per element + the path', () => {
    const q: Query = { filters: [{ field: 'id', op: 'in', value: [2, 4] }] };
    const { sql, params } = buildSelect('notes', q);
    expect(sql).toBe("SELECT doc FROM \"notes\" WHERE json_extract(doc, ?) IN (?, ?)");
    expect(params).toEqual(['$.id', 2, 4]);
  });

  it('in with an empty array -> contradiction (IN ())-safe: matches nothing', () => {
    const q: Query = { filters: [{ field: 'id', op: 'in', value: [] }] };
    const { sql } = buildSelect('notes', q);
    expect(sql).toBe("SELECT doc FROM \"notes\" WHERE 0");
  });

  it('like -> LIKE ? ESCAPE with %term% and escaped wildcards', () => {
    const q: Query = { filters: [{ field: 'name', op: 'like', value: 'al' }] };
    const { sql, params } = buildSelect('notes', q);
    expect(sql).toBe("SELECT doc FROM \"notes\" WHERE json_extract(doc, ?) LIKE ? ESCAPE '\\'");
    expect(params).toEqual(['$.name', '%al%']);
  });

  it('like escapes raw % and _ in the term', () => {
    const q: Query = { filters: [{ field: 'name', op: 'like', value: '50%_x' }] };
    const { params } = buildSelect('notes', q);
    expect(params).toEqual(['$.name', '%50\\%\\_x%']);
  });

  it('ANDs multiple filters', () => {
    const q: Query = {
      filters: [
        { field: 'tier', op: 'eq', value: 'gold' },
        { field: 'score', op: 'gte', value: 20 },
      ],
    };
    const { sql, params } = buildSelect('notes', q);
    expect(sql).toBe(
      "SELECT doc FROM \"notes\" WHERE json_extract(doc, ?) = ? AND json_extract(doc, ?) >= ?",
    );
    expect(params).toEqual(['$.tier', 'gold', '$.score', 20]);
  });

  it('ORDER BY honours multi-key sort and direction', () => {
    const q: Query = {
      sort: [
        { field: 'score', dir: 'desc' },
        { field: 'name', dir: 'asc' },
      ],
    };
    const { sql, params } = buildSelect('notes', q);
    expect(sql).toBe(
      "SELECT doc FROM \"notes\" ORDER BY json_extract(doc, ?) DESC, json_extract(doc, ?) ASC",
    );
    expect(params).toEqual(['$.score', '$.name']);
  });

  it('appends LIMIT and OFFSET (bound params)', () => {
    const q: Query = { limit: 10, offset: 5 };
    const { sql, params } = buildSelect('notes', q);
    expect(sql).toBe("SELECT doc FROM \"notes\" LIMIT ? OFFSET ?");
    expect(params).toEqual([10, 5]);
  });

  it('rejects an injection in the table name', () => {
    expect(() => buildSelect('notes; DROP TABLE x', {})).toThrow();
  });
});
