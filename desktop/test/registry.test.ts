import { describe, it, expect, beforeEach } from 'vitest';
import { registerNative, resolve, clearRegistry } from '../src/registry';

beforeEach(() => clearRegistry());

describe('registry', () => {
  it('resolves a registered method and returns undefined otherwise', () => {
    registerNative([{ name: 'fs', methods: { readFile: async () => 'x' } }]);
    expect(typeof resolve('fs', 'readFile')).toBe('function');
    expect(resolve('fs', 'nope')).toBeUndefined();
    expect(resolve('shell', 'openExternal')).toBeUndefined();
  });
});
