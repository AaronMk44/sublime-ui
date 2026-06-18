import { describe, it, expect, beforeEach } from 'vitest';
import {
  configureSublime,
  getConfig,
  resetConfig,
  type SublimeConfig,
} from '../src/config/Config.js';

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

describe('Config', () => {
  beforeEach(() => resetConfig());

  it('throws if read before configured', () => {
    expect(() => getConfig()).toThrow(/configureSublime/);
  });

  it('returns the configured values', () => {
    configureSublime(fake);
    expect(getConfig().baseURL).toBe('https://api.example.com');
    expect(getConfig().platform).toBe('web');
  });
});
