import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { http } from '../src/gateway/http.js';
import { ApiError } from '../src/gateway/ApiError.js';
import { configureSublime, resetConfig } from '../src/config/Config.js';
import { mockFetch } from '../src/test-utils/mockFetch.js';

function configure(token: string | null = 'tok') {
  configureSublime({
    baseURL: 'https://api.example.com',
    tokenProvider: async () => token,
    storageAdapter: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} },
    platform: 'web',
  });
}

describe('http.request', () => {
  beforeEach(() => { resetConfig(); configure(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('prepends baseURL, attaches Bearer token, returns ApiResponse', async () => {
    let seen: { url: string; method: string; auth?: string | undefined } | null = null;
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      seen = { url, method: init?.method ?? 'GET', auth: headers.get('Authorization') ?? undefined };
      return { ok: true, status: 200, json: async () => ({ success: true, message: 'ok', data: { id: 1 }, errors: null }) } as Response;
    });
    const res = await http.request<{ id: number }>({ url: '/users/1' });
    expect(seen!.url).toBe('https://api.example.com/users/1');
    expect(seen!.auth).toBe('Bearer tok');
    expect(res.data).toEqual({ id: 1 });
  });

  it('throws ApiError on non-2xx with status', async () => {
    mockFetch(() => ({ status: 404, json: { success: false, message: 'Not found', data: null, errors: { id: ['missing'] } } }));
    await expect(http.request({ url: '/users/9' })).rejects.toMatchObject({
      name: 'HttpError', status: 404, url: 'https://api.example.com/users/9',
    });
  });

  it('throws ApiError when success is false even on 200', async () => {
    mockFetch(() => ({ status: 200, json: { success: false, message: 'Invalid', data: null, errors: {} } }));
    await expect(http.request({ url: '/users' })).rejects.toBeInstanceOf(ApiError);
  });

  it('throws ApiError on a network failure', async () => {
    vi.stubGlobal('fetch', async () => { throw new TypeError('network down'); });
    await expect(http.request({ url: '/users' })).rejects.toBeInstanceOf(ApiError);
  });
});
