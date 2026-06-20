### Task D1: HTTP transport — raw-`T` return + typed-error classification

**Files:**
- Modify: `framework/src/gateway/http.ts:1-56` (full rewrite of the request body; current: imports 1-3, `RequestConfig` 5-9, `async function request<T>` 11-53 with throw sites at lines 31/38/46 and `return parsed` at 52, `export const http` at 55)
- Test: `framework/test/http.test.ts` (migrate existing — current `res.data` assertion at line 30, `name: 'ApiError'` at line 36, network case at lines 45-48)

**Interfaces:**
- Consumes: `getHttpConfig(): { baseURL: string; tokenProvider: () => Promise<string|null> }` (from `config/Config.js`); `HttpError` (from `gateway/HttpError.js`, constructed `new HttpError(message, { status, url, errors })`); `NetworkError` (from `errors/NetworkError.js`, `new NetworkError(message, { url, cause })`); `AuthError` (from `errors/AuthError.js`, `new AuthError(message, { status, cause })`); `ValidationError` (from `errors/ValidationError.js`, `new ValidationError(message, { fields, cause })`); `ApiResponse<T>` (from `entities/ApiResponse.js`); `DataError` (from `errors/DataError.js`, base of all the above)
- Produces: `RequestConfig` (unchanged: `{ url: string; method?: 'GET'|'POST'|'PUT'|'PATCH'|'DELETE'; body?: unknown }`); `http.request<T>(config: RequestConfig): Promise<T>` (now returns RAW `T` = `parsed.data`, throws typed `DataError` subtypes)

- [ ] **Step 1: Write the failing test** — replace the entire contents of `framework/test/http.test.ts` with:
```ts
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
    vi.stubGlobal('fetch', async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('bad json'); } }) as Response);
    const err = await http.request({ url: '/users' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(200);
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/http.test.ts`
Expected: FAIL — module resolution / classification errors, e.g. `Failed to resolve import "../src/gateway/HttpError.js"` is satisfied by the error phase, but `http` still returns the `ApiResponse` envelope so `expect(res).toEqual({ id: 1 })` fails with "expected { success: true, ... } to deeply equal { id: 1 }", and the 401/422/network assertions fail with "expected ApiError to be an instance of AuthError/ValidationError/NetworkError".
- [ ] **Step 3: Rewrite `framework/src/gateway/http.ts` (complete code)** — replace the entire file:
```ts
import { getHttpConfig } from '../config/Config.js';
import { HttpError } from './HttpError.js';
import { NetworkError } from '../errors/NetworkError.js';
import { AuthError } from '../errors/AuthError.js';
import { ValidationError } from '../errors/ValidationError.js';
import type { ApiResponse } from '../entities/ApiResponse.js';

export interface RequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/**
 * Performs an HTTP request, unwraps the (HTTP-internal) ApiResponse envelope and
 * returns the RAW `T` (`parsed.data`). Real failures throw a typed DataError:
 *   fetch threw          -> NetworkError
 *   invalid JSON body    -> HttpError
 *   401 / 403            -> AuthError
 *   422                  -> ValidationError
 *   any other non-2xx    -> HttpError   (404 included; HttpGateway maps it to null)
 *   success === false    -> HttpError
 */
async function request<T>(config: RequestConfig): Promise<T> {
  const { baseURL, tokenProvider } = getHttpConfig();
  const fullUrl = `${baseURL}${config.url}`;
  const token = await tokenProvider();

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token !== null) headers['Authorization'] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      method: config.method ?? 'GET',
      headers,
      ...(config.body === undefined ? {} : { body: JSON.stringify(config.body) }),
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Network request failed';
    throw new NetworkError(message, { url: fullUrl, cause });
  }

  let parsed: ApiResponse<T>;
  try {
    parsed = (await response.json()) as ApiResponse<T>;
  } catch (cause) {
    throw new HttpError('Invalid JSON response', {
      status: response.status,
      errors: cause,
      url: fullUrl,
    });
  }

  if (!response.ok || parsed.success === false) {
    const message = parsed.message || `Request failed (${response.status})`;
    if (response.status === 401 || response.status === 403) {
      throw new AuthError(message, { status: response.status, cause: parsed.errors });
    }
    if (response.status === 422) {
      throw new ValidationError(message, { fields: parsed.errors, cause: parsed.errors });
    }
    throw new HttpError(message, {
      status: response.status,
      errors: parsed.errors,
      url: fullUrl,
    });
  }
  return parsed.data;
}

export const http = { request };
```
- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/http.test.ts`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add framework/src/gateway/http.ts framework/test/http.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "refactor(framework): http.request returns raw data and throws typed DataErrors"
```

---

### Task D2: HttpGateway class (RequestCapableGateway over REST)

**Files:**
- Create: `framework/src/gateway/HttpGateway.ts`
- Modify (rename + rewrite): `framework/test/Gateway.test.ts` -> `framework/test/HttpGateway.test.ts` (current: `new Gateway('/users')` at line 32, `?storeId=7` assertion at line 50, envelope `data: []` stub at line 13)
- Test: `framework/test/HttpGateway.test.ts`

**Interfaces:**
- Consumes: `Gateway`, `RequestCapableGateway`, `Row`, `Id` (from `gateway/Gateway.js` — the rewritten interface module); `GatewayDeps` (from `gateway/GatewayDeps.js`, `{ resource, idKey, sliceName, actions, store }`); `RequestConfig`, `http` (from `gateway/http.js`, `http.request<T>(config): Promise<T>`); `HttpError` (from `gateway/HttpError.js`, has `.status`); `toQueryString(q?: Query): string` (from `gateway/HttpGateway.js` itself — co-located helper, see Step 3); `Query`, `QueryFilter`, `FilterValue` (from `gateway/Query.js`); `registerModel(M, HttpGateway)` overload (from `register.js`, for the registration-driven assertion); `Model` (from `model/Model.js`, for the registration test fixture)
- Produces: `HttpGateway` (class implementing `RequestCapableGateway`, constructed `new HttpGateway(deps: GatewayDeps)`); `toQueryString(q?: Query): string` (exported helper — `eq` scalar -> flat `?field=value`; non-`eq` -> `filter[field][op]=value`; `in` -> repeated keys; `sort=field`/`sort=-field`; flat `limit`/`offset`)

- [ ] **Step 1: Write the failing test** — create `framework/test/HttpGateway.test.ts` (this replaces the renamed `framework/test/Gateway.test.ts`):
```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HttpGateway } from '../src/gateway/HttpGateway.js';
import { toQueryString } from '../src/gateway/HttpGateway.js';
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

  it('toQueryString: empty / undefined -> empty string', () => {
    expect(toQueryString()).toBe('');
    expect(toQueryString({})).toBe('');
  });

  it('toQueryString: non-eq filter, in, sort, limit, offset', () => {
    expect(toQueryString({ filters: [{ field: 'age', op: 'gte', value: 18 }] }))
      .toBe('?filter[age][gte]=18');
    expect(toQueryString({ filters: [{ field: 'id', op: 'in', value: [1, 2] }] }))
      .toBe('?filter[id][in]=1&filter[id][in]=2');
    expect(toQueryString({ sort: [{ field: 'name', dir: 'asc' }, { field: 'age', dir: 'desc' }] }))
      .toBe('?sort=name&sort=-age');
    expect(toQueryString({ limit: 10, offset: 20 })).toBe('?limit=10&offset=20');
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/HttpGateway.test.ts`
Expected: FAIL with `Failed to resolve import "../src/gateway/HttpGateway.js"` (the module does not exist yet).
- [ ] **Step 3: Create `framework/src/gateway/HttpGateway.ts` (complete code)**:
```ts
import { http, type RequestConfig } from './http.js';
import { HttpError } from './HttpError.js';
import type { Gateway, RequestCapableGateway, Row, Id } from './Gateway.js';
import type { GatewayDeps } from './GatewayDeps.js';
import type { Query, QueryFilter, FilterValue } from './Query.js';

/**
 * Serialises a neutral Query to a REST query string.
 *   eq scalar  -> flat `?field=value`        (preserves today's `?storeId=7`)
 *   other ops  -> `filter[field][op]=value`
 *   in         -> repeated `filter[field][in]=v` keys
 *   sort       -> `sort=field` / `sort=-field` (desc), repeated, in order
 *   limit/offset -> flat keys
 */
export function toQueryString(q?: Query): string {
  if (!q) return '';
  const parts: string[] = [];

  const enc = (v: string | number | boolean): string => encodeURIComponent(String(v));

  for (const f of q.filters ?? []) {
    appendFilter(parts, f);
  }
  for (const s of q.sort ?? []) {
    parts.push(`sort=${s.dir === 'desc' ? '-' : ''}${enc(s.field)}`);
  }
  if (q.limit !== undefined) parts.push(`limit=${enc(q.limit)}`);
  if (q.offset !== undefined) parts.push(`offset=${enc(q.offset)}`);

  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

function appendFilter(parts: string[], f: QueryFilter): void {
  const key = encodeURIComponent(f.field);
  const scalar = (v: FilterValue): string =>
    encodeURIComponent(String(v));
  if (f.op === 'eq') {
    // flat shape — preserves today's `?storeId=7`
    parts.push(`${key}=${scalar(f.value)}`);
    return;
  }
  if (f.op === 'in' && Array.isArray(f.value)) {
    for (const v of f.value) parts.push(`filter[${key}][in]=${encodeURIComponent(String(v))}`);
    return;
  }
  parts.push(`filter[${key}][${f.op}]=${scalar(f.value)}`);
}

/**
 * REST strategy. Returns RAW rows (http.request unwraps the envelope) and throws
 * typed DataErrors. show() maps a 404 to null (absence is not a failure). The
 * only request-capable gateway: Model.call() routes here.
 */
export class HttpGateway implements RequestCapableGateway {
  constructor(private readonly deps: GatewayDeps) {}

  private get resource(): string {
    return this.deps.resource;
  }

  index(query?: Query): Promise<Row[]> {
    return http.request<Row[]>({ url: `${this.resource}${toQueryString(query)}` });
  }

  async show(id: Id): Promise<Row | null> {
    try {
      return await http.request<Row>({ url: `${this.resource}/${id}` });
    } catch (e) {
      if (e instanceof HttpError && e.status === 404) return null;
      throw e;
    }
  }

  create(body: Row): Promise<Row> {
    return http.request<Row>({ url: this.resource, method: 'POST', body });
  }

  update(id: Id, body: Row): Promise<Row> {
    return http.request<Row>({ url: `${this.resource}/${id}`, method: 'PUT', body });
  }

  async destroy(id: Id): Promise<void> {
    await http.request<unknown>({ url: `${this.resource}/${id}`, method: 'DELETE' });
  }

  request<T>(config: RequestConfig): Promise<T> {
    return http.request<T>(config);
  }
}

// Compile-time guard: HttpGateway satisfies the Gateway interface.
const _typecheck: new (deps: GatewayDeps) => Gateway = HttpGateway;
void _typecheck;
```
- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/HttpGateway.test.ts`
Expected: PASS
- [ ] **Step 5: Commit** (the rename is recorded by removing the old test and adding the new one in the same commit):
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" rm framework/test/Gateway.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add framework/src/gateway/HttpGateway.ts framework/test/HttpGateway.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "feat(framework): add HttpGateway (RequestCapableGateway) with toQueryString and 404->null"
```
