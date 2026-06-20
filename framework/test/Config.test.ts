import { describe, it, expect, beforeEach } from 'vitest';
import {
  configureSublime,
  getConfig,
  getHttpConfig,
  getDatabaseAdapter,
  resetConfig,
  type SublimeConfig,
} from '../src/config/Config.js';
import { ConfigError } from '../src/errors/ConfigError.js';
import type { DatabaseAdapter } from '../src/gateway/DatabaseAdapter.js';

const fake: SublimeConfig = {
  baseURL: 'https://api.example.com',
  tokenProvider: async () => 'tok',
  storageAdapter: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  },
  platform: 'web',
};

const fakeDbAdapter: DatabaseAdapter = {
  ensureCollection: async () => {},
  get: async () => null,
  getAll: async () => [],
  query: async () => [],
  insert: async (_r, row) => row,
  update: async (_r, _id, row) => row,
  delete: async () => {},
};

describe('Config', () => {
  beforeEach(() => resetConfig());

  it('throws if read before configured', () => {
    expect(() => getConfig()).toThrow(/configureSublime/);
  });

  it('returns the configured values (4-field config still valid)', () => {
    configureSublime(fake);
    expect(getConfig().baseURL).toBe('https://api.example.com');
    expect(getConfig().platform).toBe('web');
  });

  it('accepts a platform-only config (zero-config in-memory default)', () => {
    expect(() => configureSublime({ platform: 'web' })).not.toThrow();
    expect(getConfig().platform).toBe('web');
  });

  it('getHttpConfig returns baseURL + tokenProvider when present', async () => {
    configureSublime(fake);
    const http = getHttpConfig();
    expect(http.baseURL).toBe('https://api.example.com');
    expect(await http.tokenProvider()).toBe('tok');
  });

  it('getHttpConfig defaults tokenProvider to "no token" when omitted', async () => {
    configureSublime({ platform: 'web', baseURL: 'https://x.test' });
    expect(await getHttpConfig().tokenProvider()).toBeNull();
  });

  it('getHttpConfig throws ConfigError when baseURL is absent', () => {
    configureSublime({ platform: 'web' });
    expect(() => getHttpConfig()).toThrow(ConfigError);
    expect(() => getHttpConfig()).toThrow(/baseURL/);
  });

  it('getDatabaseAdapter returns the configured adapter', () => {
    configureSublime({ platform: 'web', databaseAdapter: fakeDbAdapter });
    expect(getDatabaseAdapter()).toBe(fakeDbAdapter);
  });

  it('getDatabaseAdapter throws ConfigError when adapter is absent', () => {
    configureSublime({ platform: 'web' });
    expect(() => getDatabaseAdapter()).toThrow(ConfigError);
    expect(() => getDatabaseAdapter()).toThrow(/databaseAdapter/);
  });
});
