import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IndexedDbAdapter } from '../src/web.js';
import { createDatabaseAdapter } from '../src/createDatabaseAdapter.web.js';

// The desktop bridge `getNative` reads is `globalThis.sublimeNative = { invoke }`
// (the ONE real IPC channel — see desktop/src/get-native.ts). H4's web entry is
// web-only, so this file only asserts the no-bridge case here; I2 adds the
// bridge-present (→ SQLite) case using `globalThis.sublimeNative = { invoke }`.
type NativeBridge = {
  sublimeNative?: { invoke: (mod: string, method: string, args: unknown[]) => Promise<unknown> };
};

afterEach(() => {
  delete (globalThis as NativeBridge).sublimeNative;
});

describe('createDatabaseAdapter (web resolution)', () => {
  beforeEach(() => {
    delete (globalThis as NativeBridge).sublimeNative;
  });

  it('returns an IndexedDbAdapter when no desktop native bridge is present', () => {
    const adapter = createDatabaseAdapter();
    expect(adapter).toBeInstanceOf(IndexedDbAdapter);
  });
});
