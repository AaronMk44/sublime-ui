import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HttpGateway, toQueryString } from '../src/gateway/HttpGateway.js';
import type { GatewayDeps } from '../src/gateway/GatewayDeps.js';
import { configureSublime, resetConfig } from '../src/config/Config.js';

function deps(resource: string): GatewayDeps {
  return {
    resource,
    idKey: 'id',
    sliceName: 'rows',
    // actions + store are unused by HttpGateway's CRUD path (it talks to fetch);
    // cast minimal stubs to satisfy the bundle type.
    actions: {} as GatewayDeps['actions'],
    store: { getState: () => ({}), dispatch: () => undefined } as unknown as GatewayDeps['store'],
  };
}

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

describe('HttpGateway', () => {
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
    const g = new HttpGateway(deps('/users'));
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

  it('serialises a flat eq filter to ?storeId=7 (preserves today\'s shape)', async () => {
    const seen = calls();
    await new HttpGateway(deps('/sales')).index({ filters: [{ field: 'storeId', op: 'eq', value: 7 }] });
    expect(seen[0]!.url).toBe('https://api.example.com/sales?storeId=7');
  });

  it('show() returns the raw row (unwrapped, not res.data envelope)', async () => {
    vi.stubGlobal('fetch', async () =>
      ({ ok: true, status: 200, json: async () => ({ success: true, message: '', data: { id: 1, name: 'a' }, errors: null }) }) as Response);
    const row = await new HttpGateway(deps('/users')).show(1);
    expect(row).toEqual({ id: 1, name: 'a' });
  });

  it('show() maps a 404 to null (absence is not a failure)', async () => {
    vi.stubGlobal('fetch', async () =>
      ({ ok: false, status: 404, json: async () => ({ success: false, message: 'gone', data: null, errors: null }) }) as Response);
    const row = await new HttpGateway(deps('/users')).show(99);
    expect(row).toBeNull();
  });

  it('show() rethrows non-404 errors', async () => {
    vi.stubGlobal('fetch', async () =>
      ({ ok: false, status: 500, json: async () => ({ success: false, message: 'boom', data: null, errors: null }) }) as Response);
    await expect(new HttpGateway(deps('/users')).show(1)).rejects.toMatchObject({ status: 500 });
  });

  it('request<T>() is a passthrough to http.request', async () => {
    const seen = calls();
    await new HttpGateway(deps('/users')).request<unknown[]>({ url: '/users/expired' });
    expect(seen[0]).toEqual({ url: 'https://api.example.com/users/expired', method: 'GET', body: undefined });
  });

  // toQueryString is the co-located B3 helper (see HttpGateway.ts); HttpGateway
  // reuses it verbatim. These assertions pin the COMMITTED B3 serialization shape
  // (URL-encoded filter brackets, comma-joined multi-key sort) — see
  // toQueryString.test.ts for the full contract.
  it('toQueryString: empty / undefined -> empty string', () => {
    expect(toQueryString()).toBe('');
    expect(toQueryString({})).toBe('');
  });

  it('toQueryString: non-eq filter, in, sort, limit, offset', () => {
    expect(toQueryString({ filters: [{ field: 'age', op: 'gte', value: 18 }] }))
      .toBe('?filter%5Bage%5D%5Bgte%5D=18');
    expect(toQueryString({ filters: [{ field: 'id', op: 'in', value: [1, 2] }] }))
      .toBe('?filter%5Bid%5D%5Bin%5D=1&filter%5Bid%5D%5Bin%5D=2');
    expect(toQueryString({ sort: [{ field: 'name', dir: 'asc' }, { field: 'age', dir: 'desc' }] }))
      .toBe('?sort=name%2C-age');
    expect(toQueryString({ limit: 10, offset: 20 })).toBe('?limit=10&offset=20');
  });
});
