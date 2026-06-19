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

  it('does not resolve inherited prototype-chain members (own-property only)', () => {
    registerNative([{ name: 'fs', methods: { readFile: async () => 'x' } }]);
    expect(resolve('fs', 'constructor')).toBeUndefined();
    expect(resolve('fs', '__proto__')).toBeUndefined();
    expect(resolve('fs', 'toString')).toBeUndefined();
    expect(resolve('fs', 'hasOwnProperty')).toBeUndefined();
    expect(resolve('fs', 'valueOf')).toBeUndefined();
  });
});
