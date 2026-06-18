import { describe, it, expect } from 'vitest';
import { parseFields } from '../../src/lib/generators/fields.js';

describe('parseFields', () => {
  it('parses scalar types', () => {
    const { fields, warnings } = parseFields('name:string, age:number, active:boolean');
    expect(fields).toEqual([
      { name: 'name', tsType: 'string' },
      { name: 'age', tsType: 'number' },
      { name: 'active', tsType: 'boolean' },
    ]);
    expect(warnings).toEqual([]);
  });
  it('keeps array types', () => {
    expect(parseFields('tags:Tag[]').fields).toEqual([{ name: 'tags', tsType: 'Tag[]' }]);
  });
  it('defaults unknown scalar to string with a warning', () => {
    const { fields, warnings } = parseFields('ref:Widget');
    expect(fields).toEqual([{ name: 'ref', tsType: 'string' }]);
    expect(warnings[0]).toMatch(/ref.*Widget.*string/);
  });
  it('returns empty for blank input', () => {
    expect(parseFields('').fields).toEqual([]);
  });
});
