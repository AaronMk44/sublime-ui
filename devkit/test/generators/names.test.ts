import { describe, it, expect } from 'vitest';
import { deriveNames } from '../../src/lib/generators/names.js';

describe('deriveNames', () => {
  it('derives PascalCase class + pluralized resource/slice', () => {
    expect(deriveNames('user')).toEqual({
      className: 'User', resource: '/users', sliceName: 'users', fileName: 'User',
    });
  });
  it('handles y -> ies', () => {
    expect(deriveNames('Category').resource).toBe('/categories');
    expect(deriveNames('Category').sliceName).toBe('categories');
  });
  it('handles s/x/ch/sh -> es', () => {
    expect(deriveNames('Box').resource).toBe('/boxes');
    expect(deriveNames('dish').resource).toBe('/dishes');
  });
  it('PascalCases multi-word input', () => {
    expect(deriveNames('store-type').className).toBe('StoreType');
    expect(deriveNames('store-type').resource).toBe('/storetypes');
  });
});
