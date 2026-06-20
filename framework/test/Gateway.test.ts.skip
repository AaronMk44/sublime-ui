import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Gateway } from '../src/gateway/Gateway.js';
import { configureSublime, resetConfig } from '../src/config/Config.js';

function calls() {
  const seen: { url: string; method: string; body: unknown }[] = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    seen.push({
      url,
      method: init?.method ?? 'GET',
      body: init?.body ? JSON.parse(init.body as string) : undefined,
    });
    return { ok: true, status: 200, json: async () => ({ success: true, message: '', data: [], errors: null }) } as Response;
  });
  return seen;
}

describe('Gateway', () => {
  beforeEach(() => {
    resetConfig();
    configureSublime({
      baseURL: 'https://api.example.com',
      tokenProvider: async () => null,
      storageAdapter: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} },
      platform: 'web',
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('maps CRUD methods to the right URL + verb', async () => {
    const seen = calls();
    const g = new Gateway('/users');
    await g.index();
    await g.show(1);
    await g.create({ name: 'a' });
    await g.update(1, { name: 'b' });
    await g.destroy(1);
    expect(seen).toEqual([
      { url: 'https://api.example.com/users', method: 'GET', body: undefined },
      { url: 'https://api.example.com/users/1', method: 'GET', body: undefined },
      { url: 'https://api.example.com/users', method: 'POST', body: { name: 'a' } },
      { url: 'https://api.example.com/users/1', method: 'PUT', body: { name: 'b' } },
      { url: 'https://api.example.com/users/1', method: 'DELETE', body: undefined },
    ]);
  });

  it('serialises index() query params', async () => {
    const seen = calls();
    await new Gateway('/sales').index({ storeId: 7 });
    expect(seen[0]!.url).toBe('https://api.example.com/sales?storeId=7');
  });
});
