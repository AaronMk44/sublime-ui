import { describe, it, expect } from 'vitest';
import { ModelCollection } from '../src/model/ModelCollection.js';

interface Row { id: number; name: string; active: boolean }
const rows: Row[] = [
  { id: 1, name: 'b', active: true },
  { id: 2, name: 'a', active: false },
  { id: 3, name: 'c', active: true },
];

describe('ModelCollection', () => {
  it('where filters by equality and returns a collection', () => {
    const c = new ModelCollection(rows).where('active', true);
    expect(c.map((r) => r.id)).toEqual([1, 3]);
    expect(c).toBeInstanceOf(ModelCollection);
  });

  it('whereIn filters by membership', () => {
    expect(new ModelCollection(rows).whereIn('id', [1, 3]).length).toBe(2);
  });

  it('sortBy orders ascending', () => {
    expect(new ModelCollection(rows).sortBy('name').map((r) => r.name)).toEqual(['a', 'b', 'c']);
  });

  it('find and first', () => {
    expect(new ModelCollection(rows).find((r) => r.name === 'a')?.id).toBe(2);
    expect(new ModelCollection(rows).first()?.id).toBe(1);
  });

  it('is iterable and exposes length', () => {
    expect([...new ModelCollection(rows)].length).toBe(3);
    expect(new ModelCollection(rows).length).toBe(3);
  });

  it('carries status meta with sane defaults', () => {
    const c = new ModelCollection(rows);
    expect(c.loading).toBe(false);
    expect(c.error).toBeNull();
    const withMeta = new ModelCollection(rows, { loading: true });
    expect(withMeta.loading).toBe(true);
  });
});
