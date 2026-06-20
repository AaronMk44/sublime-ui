import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { http } from '../src/gateway/http.js';
import { HttpError } from '../src/gateway/HttpError.js';
import { NetworkError } from '../src/errors/NetworkError.js';
import { AuthError } from '../src/errors/AuthError.js';
import { ValidationError } from '../src/errors/ValidationError.js';
import { DataError } from '../src/errors/DataError.js';
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

  it('prepends baseURL, attaches Bearer token, returns raw data (unwrapped)', async () => {
    let seen: { url: string; method: string; auth?: string | undefined } | null = null;
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      seen = { url, method: init?.method ?? 'GET', auth: headers.get('Authorization') ?? undefined };
      return { ok: true, status: 200, json: async () => ({ success: true, message: 'ok', data: { id: 1 }, errors: null }) } as Response;
    });
    const res = await http.request<{ id: number }>({ url: '/users/1' });
    expect(seen!.url).toBe('https://api.example.com/users/1');
    expect(seen!.auth).toBe('Bearer tok');
    expect(res).toEqual({ id: 1 });
  });

  it('throws HttpError (name HttpError, instanceof DataError) on non-2xx with status', async () => {
    mockFetch(() => ({ status: 404, json: { success: false, message: 'Not found', data: null, errors: { id: ['missing'] } } }));
    const err = await http.request({ url: '/users/9' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err).toBeInstanceOf(DataError);
    expect((err as HttpError).name).toBe('HttpError');
    expect((err as HttpError).status).toBe(404);
    expect((err as HttpError).url).toBe('https://api.example.com/users/9');
    expect((err as HttpError).code).toBe('http');
  });

  it('throws HttpError when success is false even on 200', async () => {
    mockFetch(() => ({ status: 200, json: { success: false, message: 'Invalid', data: null, errors: {} } }));
    await expect(http.request({ url: '/users' })).rejects.toBeInstanceOf(HttpError);
  });

  it('throws AuthError on 401', async () => {
    mockFetch(() => ({ status: 401, json: { success: false, message: 'Unauthorized', data: null, errors: null } }));
    const err = await http.request({ url: '/users' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AuthError);
    expect(err).toBeInstanceOf(DataError);
    expect((err as AuthError).code).toBe('auth');
    expect((err as AuthError).status).toBe(401);
  });

  it('throws AuthError on 403', async () => {
    mockFetch(() => ({ status: 403, json: { success: false, message: 'Forbidden', data: null, errors: null } }));
    await expect(http.request({ url: '/users' })).rejects.toBeInstanceOf(AuthError);
  });

  it('throws ValidationError on 422', async () => {
    mockFetch(() => ({ status: 422, json: { success: false, message: 'Unprocessable', data: null, errors: { name: ['required'] } } }));
    const err = await http.request({ url: '/users' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toBeInstanceOf(DataError);
    expect((err as ValidationError).code).toBe('validation');
    expect((err as ValidationError).fields).toEqual({ name: ['required'] });
  });

  it('throws NetworkError on a fetch (connection) failure', async () => {
    vi.stubGlobal('fetch', async () => { throw new TypeError('network down'); });
    const err = await http.request({ url: '/users' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NetworkError);
    expect(err).toBeInstanceOf(DataError);
    expect((err as NetworkError).code).toBe('network');
    expect((err as NetworkError).url).toBe('https://api.example.com/users');
  });

  it('throws HttpError on invalid JSON body', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('bad json'); } }) as unknown as Response);
    const err = await http.request({ url: '/users' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(200);
  });
});
