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

// storage/test/createDatabaseAdapter.test.ts — append (I2 adds the bridge-present case)
import { vi } from 'vitest';
import { SqliteAdapter } from '../src/sqlite/SqliteAdapter.js';

describe('createDatabaseAdapter (web entry) — desktop bridge detection (I2)', () => {
  function installBridge(): void {
    (globalThis as unknown as { sublimeNative: { invoke: (m: string, method: string, a: unknown[]) => Promise<unknown> } }).sublimeNative = {
      invoke: async (_mod, method) => {
        switch (method) {
          case 'exec':
            return undefined;
          case 'all':
            return [];
          case 'get':
            return undefined;
          case 'run':
            return { changes: 0 };
          default:
            throw new Error(`unexpected method ${method}`);
        }
      },
    };
  }

  afterEach(() => {
    vi.clearAllMocks();
    delete (globalThis as unknown as { sublimeNative?: unknown }).sublimeNative;
  });

  it('returns a SQLite-over-IPC adapter when the desktop native bridge is present', () => {
    installBridge();
    const adapter = createDatabaseAdapter();
    expect(adapter).toBeInstanceOf(SqliteAdapter);
  });
});
