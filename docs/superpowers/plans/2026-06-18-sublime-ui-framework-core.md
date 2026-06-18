# Sublime UI — Framework App-Architecture Core (#2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@sublime-ui/framework` — the Model-centric runtime that abstracts Redux + API behind Laravel/Eloquent-style `Model` classes, so a hand-written `User extends Model` supports `all/find/save/delete`, custom `call`, and reactive `rxAll/rxFind` reads, with the Redux store holding only plain JSON.

**Architecture:** Pure, deterministic units (`ApiError`, `Config`, `http`, `Gateway`, `cast`, `ModelCollection`, `createModelSlice`, registries) are TDD'd; the `Model` base class and its `rx` React hooks wire them together. A reducer registry + dynamic store let generated/hand-written slices self-register. `Config` injects base URL, an async token provider, and a storage adapter so the core stays platform-agnostic (no React Native / DOM imports in `src/`).

**Tech Stack:** TypeScript (strict, ESM), Redux Toolkit 2, react-redux 9, React 18/19 (peer), the native `fetch` API for transport, tsup (build), vitest + @testing-library/react + jsdom (test).

## Global Constraints

- **Strict TS everywhere:** `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes`, `noUnusedLocals`, `noUnusedParameters` (inherited from `tsconfig.base.json`). ESM only.
- **Package:** `@sublime-ui/framework`, `version 0.0.0`, `"type": "module"`. No new bin.
- **Transport is the native `fetch` API** — no axios or other HTTP lib.
- **Redux stores plain JSON only** — never class instances (verified by test).
- **Core is platform-agnostic:** no `react-native`, `expo-*`, or direct DOM (`window`/`document`/`localStorage`) imports in `framework/src/`. Platform specifics enter only through `Config` (token provider, storage adapter).
- **`ApiError`** is the single error type thrown by all data calls; errors are logged (visible) and never swallowed.
- **Envelope:** `ApiResponse<T> = { success: boolean; message: string; data: T; errors: unknown }`.
- **Naming:** the API-only CRUD layer is a **`Gateway`**; "Service" is reserved (not used by the framework). The base class is **`Model`**.
- **Commits:** conventional-commit messages. **Never** add Claude/AI attribution (`Co-Authored-By`, "Generated with", etc.).
- **Spec:** `docs/superpowers/specs/2026-06-18-sublime-ui-framework-core-design.md`.

---

## File Structure

```
framework/
  package.json            # + deps/devDeps, jsdom test env (Task 1)
  tsconfig.json           # include test, drop rootDir, add DOM lib (Task 1)
  vitest.config.ts        # jsdom environment (Task 1)
  src/
    entities/ApiResponse.ts     # envelope type (Task 2)
    gateway/
      ApiError.ts               # typed error class (Task 2)
      http.ts                   # fetch wrapper (Task 4)
      Gateway.ts                # resource CRUD over http (Task 5)
    config/Config.ts            # injected config (Task 3)
    model/
      cast.ts                   # hydrate / toPlain (Task 6)
      ModelCollection.ts        # array-like + helpers + status (Task 7)
      Model.ts                  # base class: CRUD + call + rx + make (Tasks 12,13)
    store/
      createModelSlice.ts       # slice factory (Task 8)
      reducerRegistry.ts        # dynamic reducer registry (Task 9)
      store.ts                  # store + registerReducer (Task 9)
      hooks.ts                  # typed useAppDispatch/useAppSelector (Task 10)
    discovery/modelRegistry.ts  # Model -> {gateway, slice, actions, idKey} (Task 11)
    register.ts                 # registerModel() glue (Task 14)
    index.ts                    # public exports (Task 15)
    test-utils/                 # test-only helpers (Task 1)
      mockFetch.ts
      renderRx.tsx
  test/                         # vitest specs (per task)
```

---

## Task 1: Framework package setup — deps, jsdom test env, tsconfig

**Files:**
- Modify: `framework/package.json`
- Modify: `framework/tsconfig.json`
- Create: `framework/vitest.config.ts`
- Create: `framework/test/setup.smoke.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a framework workspace with `@reduxjs/toolkit`, `react-redux`, React peer, and a working jsdom vitest environment so later React-hook tests run.

- [ ] **Step 1: Update `framework/package.json`**

`framework/package.json`:
```json
{
  "name": "@sublime-ui/framework",
  "version": "0.0.0",
  "type": "module",
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests",
    "lint": "eslint src"
  },
  "dependencies": {
    "@reduxjs/toolkit": "^2.3.0",
    "react-redux": "^9.1.2"
  },
  "peerDependencies": {
    "react": ">=18"
  },
  "devDependencies": {
    "@testing-library/react": "^16.0.1",
    "@types/node": "^22",
    "@types/react": "^18.3.12",
    "jsdom": "^25.0.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
```

- [ ] **Step 2: Update `framework/tsconfig.json`** (drop `rootDir`, include `test`, add `DOM` lib + React JSX for tests)

`framework/tsconfig.json`:
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": ["node"]
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 3: Create `framework/vitest.config.ts`**

`framework/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['test/**/*.test.{ts,tsx}'],
  },
});
```

- [ ] **Step 4: Create a smoke test that proves jsdom + RTK are wired**

`framework/test/setup.smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { configureStore, createSlice } from '@reduxjs/toolkit';

describe('framework test environment', () => {
  it('has a DOM (jsdom)', () => {
    expect(typeof document).toBe('object');
    expect(document.createElement('div').tagName).toBe('DIV');
  });

  it('can build a Redux Toolkit store', () => {
    const slice = createSlice({
      name: 'ping',
      initialState: { n: 0 },
      reducers: { inc: (s) => { s.n += 1; } },
    });
    const store = configureStore({ reducer: { ping: slice.reducer } });
    store.dispatch(slice.actions.inc());
    expect(store.getState().ping.n).toBe(1);
  });
});
```

- [ ] **Step 5: Install and verify**

Run from repo root:
```bash
npm install
npm run test -w @sublime-ui/framework
```
Expected: install adds the deps; the 2 smoke tests pass under jsdom.

- [ ] **Step 6: Verify typecheck + lint + build still green**

Run:
```bash
npm run typecheck -w @sublime-ui/framework
npm run lint -w @sublime-ui/framework
npm run build -w @sublime-ui/framework
```
Expected: all exit 0 (build emits `dist/index.js` from the existing stub `src/index.ts`).

- [ ] **Step 7: Commit**

```bash
git add framework/package.json framework/tsconfig.json framework/vitest.config.ts framework/test/setup.smoke.test.ts package-lock.json
git commit -m "chore(framework): add RTK/react-redux/react deps and jsdom test env"
```

---

## Task 2: `ApiResponse` envelope + `ApiError`

**Files:**
- Create: `framework/src/entities/ApiResponse.ts`
- Create: `framework/src/gateway/ApiError.ts`
- Test: `framework/test/ApiError.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface ApiResponse<T> { success: boolean; message: string; data: T; errors: unknown }`
  - `class ApiError extends Error { readonly status: number; readonly errors: unknown; readonly url: string; constructor(message: string, opts: { status: number; errors: unknown; url: string }) }`

- [ ] **Step 1: Write the failing test**

`framework/test/ApiError.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { ApiError } from '../src/gateway/ApiError.js';

describe('ApiError', () => {
  it('is an Error carrying status, errors, and url', () => {
    const err = new ApiError('Not found', {
      status: 404,
      errors: { id: ['missing'] },
      url: '/users/1',
    });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.name).toBe('ApiError');
    expect(err.message).toBe('Not found');
    expect(err.status).toBe(404);
    expect(err.errors).toEqual({ id: ['missing'] });
    expect(err.url).toBe('/users/1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @sublime-ui/framework`
Expected: FAIL — cannot resolve `../src/gateway/ApiError.js`.

- [ ] **Step 3: Write the implementations**

`framework/src/entities/ApiResponse.ts`:
```ts
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: unknown;
}
```

`framework/src/gateway/ApiError.ts`:
```ts
export interface ApiErrorOptions {
  status: number;
  errors: unknown;
  url: string;
}

/** The single error type thrown by every framework data call. */
export class ApiError extends Error {
  readonly status: number;
  readonly errors: unknown;
  readonly url: string;

  constructor(message: string, opts: ApiErrorOptions) {
    super(message);
    this.name = 'ApiError';
    this.status = opts.status;
    this.errors = opts.errors;
    this.url = opts.url;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w @sublime-ui/framework`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add framework/src/entities/ApiResponse.ts framework/src/gateway/ApiError.ts framework/test/ApiError.test.ts
git commit -m "feat(framework): add ApiResponse envelope and ApiError"
```

---

## Task 3: `Config` — the injected platform seam

**Files:**
- Create: `framework/src/config/Config.ts`
- Test: `framework/test/Config.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface StorageAdapter { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; removeItem(key: string): Promise<void> }`
  - `interface SublimeConfig { baseURL: string; tokenProvider: () => Promise<string | null>; storageAdapter: StorageAdapter; platform: 'mobile' | 'web' | 'desktop' }`
  - `configureSublime(config: SublimeConfig): void`
  - `getConfig(): SublimeConfig` — throws if `configureSublime` was not called.
  - `resetConfig(): void` — test helper to clear config.

- [ ] **Step 1: Write the failing test**

`framework/test/Config.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @sublime-ui/framework`
Expected: FAIL — cannot resolve `../src/config/Config.js`.

- [ ] **Step 3: Write the implementation**

`framework/src/config/Config.ts`:
```ts
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface SublimeConfig {
  baseURL: string;
  tokenProvider: () => Promise<string | null>;
  storageAdapter: StorageAdapter;
  platform: 'mobile' | 'web' | 'desktop';
}

let current: SublimeConfig | null = null;

export function configureSublime(config: SublimeConfig): void {
  current = config;
}

export function getConfig(): SublimeConfig {
  if (current === null) {
    throw new Error(
      'Sublime is not configured. Call configureSublime({ baseURL, tokenProvider, storageAdapter, platform }) at app startup.',
    );
  }
  return current;
}

/** Test-only: clears the configured singleton. */
export function resetConfig(): void {
  current = null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w @sublime-ui/framework`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add framework/src/config/Config.ts framework/test/Config.test.ts
git commit -m "feat(framework): add injectable Config (base URL, token, storage, platform)"
```

---

## Task 4: `http` — fetch wrapper that parses `ApiResponse` and throws `ApiError`

**Files:**
- Create: `framework/src/gateway/http.ts`
- Create: `framework/src/test-utils/mockFetch.ts`
- Test: `framework/test/http.test.ts`

**Interfaces:**
- Consumes: `getConfig` (Task 3), `ApiResponse` + `ApiError` (Task 2).
- Produces:
  - `interface RequestConfig { url: string; method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown }`
  - `http.request<T>(config: RequestConfig): Promise<ApiResponse<T>>` — prepends `baseURL`, attaches `Authorization: Bearer <token>` when `tokenProvider()` is non-null, sets JSON headers, parses the body as `ApiResponse<T>`, and throws `ApiError` on network failure, non-2xx, or `success === false`.
  - `mockFetch(handlers)` test helper (in `test-utils`).

- [ ] **Step 1: Write the test-utils mock**

`framework/src/test-utils/mockFetch.ts`:
```ts
import { vi } from 'vitest';

export interface MockResponse {
  ok?: boolean;
  status?: number;
  /** Parsed JSON body the endpoint returns. */
  json: unknown;
}

/**
 * Installs a fake global.fetch. `route` maps "METHOD url" (url is the full
 * absolute URL) to a MockResponse, or throw to simulate a network error.
 */
export function mockFetch(
  route: (input: { url: string; method: string; body: unknown }) => MockResponse,
): void {
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    const res = route({ url, method, body });
    const status = res.status ?? 200;
    const ok = res.ok ?? (status >= 200 && status < 300);
    return {
      ok,
      status,
      json: async () => res.json,
    } as Response;
  });
}
```

- [ ] **Step 2: Write the failing test**

`framework/test/http.test.ts`:
```ts
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
    let seen: { url: string; method: string; auth?: string } | null = null;
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
      name: 'ApiError', status: 404, url: 'https://api.example.com/users/9',
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -w @sublime-ui/framework`
Expected: FAIL — cannot resolve `../src/gateway/http.js`.

- [ ] **Step 4: Write the implementation**

`framework/src/gateway/http.ts`:
```ts
import { getConfig } from '../config/Config.js';
import { ApiError } from './ApiError.js';
import type { ApiResponse } from '../entities/ApiResponse.js';

export interface RequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

async function request<T>(config: RequestConfig): Promise<ApiResponse<T>> {
  const { baseURL, tokenProvider } = getConfig();
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
    throw new ApiError(message, { status: 0, errors: cause, url: fullUrl });
  }

  let parsed: ApiResponse<T>;
  try {
    parsed = (await response.json()) as ApiResponse<T>;
  } catch (cause) {
    throw new ApiError('Invalid JSON response', {
      status: response.status,
      errors: cause,
      url: fullUrl,
    });
  }

  if (!response.ok || parsed.success === false) {
    throw new ApiError(parsed.message || `Request failed (${response.status})`, {
      status: response.status,
      errors: parsed.errors,
      url: fullUrl,
    });
  }
  return parsed;
}

export const http = { request };
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -w @sublime-ui/framework`
Expected: PASS (all 4 http specs).

- [ ] **Step 6: Commit**

```bash
git add framework/src/gateway/http.ts framework/src/test-utils/mockFetch.ts framework/test/http.test.ts
git commit -m "feat(framework): add fetch-based http client that throws ApiError"
```

---

## Task 5: `Gateway` — resource CRUD over `http`

**Files:**
- Create: `framework/src/gateway/Gateway.ts`
- Test: `framework/test/Gateway.test.ts`

**Interfaces:**
- Consumes: `http` (Task 4), `ApiResponse` (Task 2).
- Produces:
  - `class Gateway` constructed with a `resource` path (e.g. `'/users'`):
    - `index<T>(query?: Record<string, string | number>): Promise<ApiResponse<T>>` → `GET /users[?…]`
    - `show<T>(id: string | number): Promise<ApiResponse<T>>` → `GET /users/:id`
    - `create<T>(body: unknown): Promise<ApiResponse<T>>` → `POST /users`
    - `update<T>(id: string | number, body: unknown): Promise<ApiResponse<T>>` → `PUT /users/:id`
    - `destroy<T>(id: string | number): Promise<ApiResponse<T>>` → `DELETE /users/:id`
    - `request<T>(config: RequestConfig): Promise<ApiResponse<T>>` → arbitrary custom call.

- [ ] **Step 1: Write the failing test**

`framework/test/Gateway.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @sublime-ui/framework`
Expected: FAIL — cannot resolve `../src/gateway/Gateway.js`.

- [ ] **Step 3: Write the implementation**

`framework/src/gateway/Gateway.ts`:
```ts
import { http, type RequestConfig } from './http.js';
import type { ApiResponse } from '../entities/ApiResponse.js';

export class Gateway {
  constructor(private readonly resource: string) {}

  index<T>(query?: Record<string, string | number>): Promise<ApiResponse<T>> {
    const qs =
      query && Object.keys(query).length > 0
        ? '?' +
          Object.entries(query)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
            .join('&')
        : '';
    return http.request<T>({ url: `${this.resource}${qs}` });
  }

  show<T>(id: string | number): Promise<ApiResponse<T>> {
    return http.request<T>({ url: `${this.resource}/${id}` });
  }

  create<T>(body: unknown): Promise<ApiResponse<T>> {
    return http.request<T>({ url: this.resource, method: 'POST', body });
  }

  update<T>(id: string | number, body: unknown): Promise<ApiResponse<T>> {
    return http.request<T>({ url: `${this.resource}/${id}`, method: 'PUT', body });
  }

  destroy<T>(id: string | number): Promise<ApiResponse<T>> {
    return http.request<T>({ url: `${this.resource}/${id}`, method: 'DELETE' });
  }

  request<T>(config: RequestConfig): Promise<ApiResponse<T>> {
    return http.request<T>(config);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w @sublime-ui/framework`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add framework/src/gateway/Gateway.ts framework/test/Gateway.test.ts
git commit -m "feat(framework): add resource Gateway (CRUD over http)"
```

---

## Task 6: `cast` — hydrate / toPlain (keeps Redux serializable)

**Files:**
- Create: `framework/src/model/cast.ts`
- Test: `framework/test/cast.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `hydrate<T extends object>(ModelClass: new () => T, plain: Record<string, unknown>): T` — instance with `plain` assigned as own data props; prototype provides getters/methods.
  - `toPlain(instance: object): Record<string, unknown>` — own enumerable data only (prototype getters/methods excluded).

- [ ] **Step 1: Write the failing test**

`framework/test/cast.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { hydrate, toPlain } from '../src/model/cast.js';

class Sample {
  declare id: number;
  declare price: number;
  get withTax(): number {
    return this.price * 1.1;
  }
}

describe('cast', () => {
  it('hydrate assigns data and exposes prototype getters', () => {
    const s = hydrate(Sample, { id: 1, price: 100 });
    expect(s).toBeInstanceOf(Sample);
    expect(s.id).toBe(1);
    expect(s.price).toBe(100);
    expect(s.withTax).toBeCloseTo(110);
  });

  it('toPlain returns only own data — getters excluded', () => {
    const s = hydrate(Sample, { id: 1, price: 100 });
    const plain = toPlain(s);
    expect(plain).toEqual({ id: 1, price: 100 });
    expect('withTax' in plain).toBe(false);
    // plain object is not a class instance
    expect(Object.getPrototypeOf(plain)).toBe(Object.prototype);
  });

  it('round-trips', () => {
    const s = hydrate(Sample, { id: 2, price: 50 });
    expect(toPlain(s)).toEqual({ id: 2, price: 50 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @sublime-ui/framework`
Expected: FAIL — cannot resolve `../src/model/cast.js`.

- [ ] **Step 3: Write the implementation**

`framework/src/model/cast.ts`:
```ts
/**
 * Builds a model instance from a plain object. Data lands as own enumerable
 * properties; getters/methods come from the prototype. No constructor runs,
 * so hydration never depends on constructor side effects.
 */
export function hydrate<T extends object>(
  ModelClass: new () => T,
  plain: Record<string, unknown>,
): T {
  const instance = Object.create(ModelClass.prototype) as T;
  Object.assign(instance, plain);
  return instance;
}

/**
 * Extracts the instance's own enumerable data — exactly what belongs in the
 * store. Prototype getters/methods are excluded, so no class instance or
 * computed value is ever persisted.
 */
export function toPlain(instance: object): Record<string, unknown> {
  return { ...instance };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w @sublime-ui/framework`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add framework/src/model/cast.ts framework/test/cast.test.ts
git commit -m "feat(framework): add cast (hydrate/toPlain) keeping the store plain"
```

---

## Task 7: `ModelCollection` — array-like results + query helpers + status

**Files:**
- Create: `framework/src/model/ModelCollection.ts`
- Test: `framework/test/ModelCollection.test.ts`

**Interfaces:**
- Consumes: `ApiError` (Task 2).
- Produces:
  - `interface CollectionMeta { loading: boolean; error: ApiError | null; refetch: () => void }`
  - `class ModelCollection<T> implements Iterable<T>`:
    - constructor `(items: T[], meta?: Partial<CollectionMeta>)`
    - `readonly items: T[]`, `readonly length: number`, `loading`, `error`, `refetch`
    - `where<K extends keyof T>(key: K, value: T[K]): ModelCollection<T>`
    - `whereIn<K extends keyof T>(key: K, values: T[K][]): ModelCollection<T>`
    - `sortBy<K extends keyof T>(key: K): ModelCollection<T>`
    - `find(predicate: (item: T) => boolean): T | undefined`
    - `first(): T | undefined`
    - `map<U>(fn: (item: T, i: number) => U): U[]`
    - `filter(fn: (item: T, i: number) => boolean): ModelCollection<T>`
    - `toArray(): T[]`
    - `[Symbol.iterator](): Iterator<T>`

- [ ] **Step 1: Write the failing test**

`framework/test/ModelCollection.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { ModelCollection } from '../src/model/ModelCollection.js';

interface Row { id: number; name: string; active: boolean }
const rows: Row[] = [
  { id: 1, name: 'b', active: true },
  { id: 2, name: 'a', active: false },
  { id: 3, name: 'c', active: true },
];

describe('ModelCollection', () => {
  it('where filters by equality and returns a collection', () => {
    const c = new ModelCollection(rows).where('active', true);
    expect(c.map((r) => r.id)).toEqual([1, 3]);
    expect(c).toBeInstanceOf(ModelCollection);
  });

  it('whereIn filters by membership', () => {
    expect(new ModelCollection(rows).whereIn('id', [1, 3]).length).toBe(2);
  });

  it('sortBy orders ascending', () => {
    expect(new ModelCollection(rows).sortBy('name').map((r) => r.name)).toEqual(['a', 'b', 'c']);
  });

  it('find and first', () => {
    expect(new ModelCollection(rows).find((r) => r.name === 'a')?.id).toBe(2);
    expect(new ModelCollection(rows).first()?.id).toBe(1);
  });

  it('is iterable and exposes length', () => {
    expect([...new ModelCollection(rows)].length).toBe(3);
    expect(new ModelCollection(rows).length).toBe(3);
  });

  it('carries status meta with sane defaults', () => {
    const c = new ModelCollection(rows);
    expect(c.loading).toBe(false);
    expect(c.error).toBeNull();
    const withMeta = new ModelCollection(rows, { loading: true });
    expect(withMeta.loading).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @sublime-ui/framework`
Expected: FAIL — cannot resolve `../src/model/ModelCollection.js`.

- [ ] **Step 3: Write the implementation**

`framework/src/model/ModelCollection.ts`:
```ts
import type { ApiError } from '../gateway/ApiError.js';

export interface CollectionMeta {
  loading: boolean;
  error: ApiError | null;
  refetch: () => void;
}

export class ModelCollection<T> implements Iterable<T> {
  readonly items: T[];
  readonly loading: boolean;
  readonly error: ApiError | null;
  readonly refetch: () => void;

  constructor(items: T[], meta: Partial<CollectionMeta> = {}) {
    this.items = items;
    this.loading = meta.loading ?? false;
    this.error = meta.error ?? null;
    this.refetch = meta.refetch ?? ((): void => {});
  }

  get length(): number {
    return this.items.length;
  }

  private withItems(items: T[]): ModelCollection<T> {
    return new ModelCollection<T>(items, {
      loading: this.loading,
      error: this.error,
      refetch: this.refetch,
    });
  }

  where<K extends keyof T>(key: K, value: T[K]): ModelCollection<T> {
    return this.withItems(this.items.filter((item) => item[key] === value));
  }

  whereIn<K extends keyof T>(key: K, values: T[K][]): ModelCollection<T> {
    return this.withItems(this.items.filter((item) => values.includes(item[key])));
  }

  sortBy<K extends keyof T>(key: K): ModelCollection<T> {
    const sorted = [...this.items].sort((a, b) =>
      a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0,
    );
    return this.withItems(sorted);
  }

  find(predicate: (item: T) => boolean): T | undefined {
    return this.items.find(predicate);
  }

  first(): T | undefined {
    return this.items[0];
  }

  map<U>(fn: (item: T, i: number) => U): U[] {
    return this.items.map(fn);
  }

  filter(fn: (item: T, i: number) => boolean): ModelCollection<T> {
    return this.withItems(this.items.filter(fn));
  }

  toArray(): T[] {
    return [...this.items];
  }

  [Symbol.iterator](): Iterator<T> {
    return this.items[Symbol.iterator]();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w @sublime-ui/framework`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add framework/src/model/ModelCollection.ts framework/test/ModelCollection.test.ts
git commit -m "feat(framework): add ModelCollection (query helpers + status)"
```

---

## Task 8: `createModelSlice` — the per-model slice factory

**Files:**
- Create: `framework/src/store/createModelSlice.ts`
- Test: `framework/test/createModelSlice.test.ts`

**Interfaces:**
- Consumes: `@reduxjs/toolkit`, `ApiError` (Task 2).
- Produces:
  - `type ModelStatus = 'idle' | 'loading' | 'success' | 'error'`
  - `interface ModelSliceState { items: Record<string, unknown>[]; activeId: string | number | null; status: ModelStatus; error: ApiError | null }`
  - `createModelSlice(name: string, opts: { idKey: string })` → `{ name, reducer, actions }` where `actions` = `{ setItems, upsertItem, upsertItems, removeItem, setActive, setStatus, setError, reset }`. Items are **plain objects** keyed by `idKey`.

- [ ] **Step 1: Write the failing test**

`framework/test/createModelSlice.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createModelSlice } from '../src/store/createModelSlice.js';

function make() {
  const slice = createModelSlice('users', { idKey: 'id' });
  let state = slice.reducer(undefined, { type: '@@init' });
  const apply = (action: { type: string; payload?: unknown }) => {
    state = slice.reducer(state, action);
    return state;
  };
  return { slice, get: () => state, apply };
}

describe('createModelSlice', () => {
  it('starts idle and empty', () => {
    const { get } = make();
    expect(get()).toEqual({ items: [], activeId: null, status: 'idle', error: null });
  });

  it('setItems replaces the collection and marks success', () => {
    const { slice, apply, get } = make();
    apply(slice.actions.setItems([{ id: 1 }, { id: 2 }]));
    expect(get().items).toEqual([{ id: 1 }, { id: 2 }]);
    expect(get().status).toBe('success');
  });

  it('upsertItem inserts or replaces by idKey', () => {
    const { slice, apply, get } = make();
    apply(slice.actions.setItems([{ id: 1, n: 'a' }]));
    apply(slice.actions.upsertItem({ id: 1, n: 'b' })); // replace
    apply(slice.actions.upsertItem({ id: 2, n: 'c' })); // insert
    expect(get().items).toEqual([{ id: 1, n: 'b' }, { id: 2, n: 'c' }]);
  });

  it('removeItem deletes by id', () => {
    const { slice, apply, get } = make();
    apply(slice.actions.setItems([{ id: 1 }, { id: 2 }]));
    apply(slice.actions.removeItem(1));
    expect(get().items).toEqual([{ id: 2 }]);
  });

  it('setStatus and setError track async state', () => {
    const { slice, apply, get } = make();
    apply(slice.actions.setStatus('loading'));
    expect(get().status).toBe('loading');
    apply(slice.actions.setError({ name: 'ApiError', message: 'x', status: 500, errors: null, url: '/u' } as never));
    expect(get().status).toBe('error');
    expect(get().error).toMatchObject({ status: 500 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @sublime-ui/framework`
Expected: FAIL — cannot resolve `../src/store/createModelSlice.js`.

- [ ] **Step 3: Write the implementation**

`framework/src/store/createModelSlice.ts`:
```ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ApiError } from '../gateway/ApiError.js';

export type ModelStatus = 'idle' | 'loading' | 'success' | 'error';

type PlainEntity = Record<string, unknown>;

export interface ModelSliceState {
  items: PlainEntity[];
  activeId: string | number | null;
  status: ModelStatus;
  error: ApiError | null;
}

export function createModelSlice(name: string, opts: { idKey: string }) {
  const { idKey } = opts;
  const initialState: ModelSliceState = {
    items: [],
    activeId: null,
    status: 'idle',
    error: null,
  };

  const slice = createSlice({
    name,
    initialState,
    reducers: {
      setItems: (state, action: PayloadAction<PlainEntity[]>) => {
        state.items = action.payload;
        state.status = 'success';
        state.error = null;
      },
      upsertItems: (state, action: PayloadAction<PlainEntity[]>) => {
        for (const incoming of action.payload) {
          const i = state.items.findIndex((it) => it[idKey] === incoming[idKey]);
          if (i === -1) state.items.push(incoming);
          else state.items[i] = incoming;
        }
        state.status = 'success';
        state.error = null;
      },
      upsertItem: (state, action: PayloadAction<PlainEntity>) => {
        const incoming = action.payload;
        const i = state.items.findIndex((it) => it[idKey] === incoming[idKey]);
        if (i === -1) state.items.push(incoming);
        else state.items[i] = incoming;
      },
      removeItem: (state, action: PayloadAction<string | number>) => {
        state.items = state.items.filter((it) => it[idKey] !== action.payload);
      },
      setActive: (state, action: PayloadAction<string | number | null>) => {
        state.activeId = action.payload;
      },
      setStatus: (state, action: PayloadAction<ModelStatus>) => {
        state.status = action.payload;
      },
      setError: (state, action: PayloadAction<ApiError | null>) => {
        state.error = action.payload;
        state.status = action.payload ? 'error' : state.status;
      },
      reset: () => initialState,
    },
  });

  return { name, reducer: slice.reducer, actions: slice.actions };
}

export type ModelSlice = ReturnType<typeof createModelSlice>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w @sublime-ui/framework`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add framework/src/store/createModelSlice.ts framework/test/createModelSlice.test.ts
git commit -m "feat(framework): add createModelSlice factory"
```

---

## Task 9: Reducer registry + dynamic store

**Files:**
- Create: `framework/src/store/reducerRegistry.ts`
- Create: `framework/src/store/store.ts`
- Test: `framework/test/store.test.ts`

**Interfaces:**
- Consumes: `@reduxjs/toolkit`, `ModelSliceState` (Task 8).
- Produces:
  - `reducerRegistry`: `{ register(name: string, reducer: Reducer): void; getReducers(): Record<string, Reducer> }`
  - `store` (a configured RTK store starting from a no-op reducer), `registerReducer(name, reducer)` (registers + injects via `replaceReducer`), `type RootState = Record<string, ModelSliceState>`, `type AppDispatch = typeof store.dispatch`.

- [ ] **Step 1: Write the failing test**

`framework/test/store.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createModelSlice } from '../src/store/createModelSlice.js';
import { store, registerReducer } from '../src/store/store.js';

describe('dynamic store', () => {
  it('injects a reducer after store creation and dispatches into it', () => {
    const slice = createModelSlice('widgets', { idKey: 'id' });
    registerReducer(slice.name, slice.reducer);

    store.dispatch(slice.actions.setItems([{ id: 1 }, { id: 2 }]));
    const state = store.getState() as Record<string, { items: unknown[] }>;
    expect(state['widgets']!.items).toEqual([{ id: 1 }, { id: 2 }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @sublime-ui/framework`
Expected: FAIL — cannot resolve `../src/store/store.js`.

- [ ] **Step 3: Write `reducerRegistry.ts`**

`framework/src/store/reducerRegistry.ts`:
```ts
import type { Reducer } from '@reduxjs/toolkit';

const reducers: Record<string, Reducer> = {};
let onChange: ((reducers: Record<string, Reducer>) => void) | null = null;

export const reducerRegistry = {
  register(name: string, reducer: Reducer): void {
    if (reducers[name]) return; // idempotent
    reducers[name] = reducer;
    onChange?.({ ...reducers });
  },
  getReducers(): Record<string, Reducer> {
    return { ...reducers };
  },
  setChangeListener(listener: (reducers: Record<string, Reducer>) => void): void {
    onChange = listener;
  },
};
```

- [ ] **Step 4: Write `store.ts`**

`framework/src/store/store.ts`:
```ts
import { configureStore, combineReducers, type Reducer } from '@reduxjs/toolkit';
import { reducerRegistry } from './reducerRegistry.js';
import type { ModelSliceState } from './createModelSlice.js';

function rootReducer(reducers: Record<string, Reducer>): Reducer {
  if (Object.keys(reducers).length === 0) {
    // RTK requires at least one reducer; a placeholder keeps the store valid
    // until the first model slice registers.
    return combineReducers({ __sublime: (state: null = null) => state });
  }
  return combineReducers(reducers);
}

export const store = configureStore({
  reducer: rootReducer(reducerRegistry.getReducers()),
  // Items are plain JSON, but ApiError lives in slice.error; disable the
  // serializable check on that single path rather than store class instances.
  middleware: (getDefault) =>
    getDefault({
      serializableCheck: { ignoredPaths: ['*.error'] },
    }),
});

reducerRegistry.setChangeListener((reducers) => {
  store.replaceReducer(rootReducer(reducers));
});

export function registerReducer(name: string, reducer: Reducer): void {
  reducerRegistry.register(name, reducer);
}

export type RootState = Record<string, ModelSliceState>;
export type AppDispatch = typeof store.dispatch;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -w @sublime-ui/framework`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add framework/src/store/reducerRegistry.ts framework/src/store/store.ts framework/test/store.test.ts
git commit -m "feat(framework): add reducer registry and dynamic store"
```

---

## Task 10: Typed hooks (`useAppDispatch` / `useAppSelector`)

**Files:**
- Create: `framework/src/store/hooks.ts`

**Interfaces:**
- Consumes: `react-redux`, `RootState`/`AppDispatch` (Task 9).
- Produces: `useAppDispatch(): AppDispatch`, `useAppSelector: TypedUseSelectorHook<RootState>`. (Exercised by the `rx` tests in Task 13; no standalone unit test — a hook with no logic is verified through its consumers.)

- [ ] **Step 1: Write `hooks.ts`**

`framework/src/store/hooks.ts`:
```ts
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './store.js';

export const useAppDispatch = (): AppDispatch => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

- [ ] **Step 2: Verify typecheck + build**

Run:
```bash
npm run typecheck -w @sublime-ui/framework
npm run build -w @sublime-ui/framework
```
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add framework/src/store/hooks.ts
git commit -m "feat(framework): add typed redux hooks"
```

---

## Task 11: Model discovery registry

**Files:**
- Create: `framework/src/discovery/modelRegistry.ts`
- Test: `framework/test/modelRegistry.test.ts`

**Interfaces:**
- Consumes: `Gateway` (Task 5), `createModelSlice` actions (Task 8).
- Produces:
  - `interface ModelRegistration { gateway: Gateway; sliceName: string; actions: ModelSlice['actions']; idKey: string }`
  - `modelRegistry`: `{ register(ctor: Function, reg: ModelRegistration): void; resolve(ctor: Function): ModelRegistration }` — `resolve` throws if the model was never registered.

- [ ] **Step 1: Write the failing test**

`framework/test/modelRegistry.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { modelRegistry } from '../src/discovery/modelRegistry.js';
import { Gateway } from '../src/gateway/Gateway.js';
import { createModelSlice } from '../src/store/createModelSlice.js';

class Thing {}

describe('modelRegistry', () => {
  it('registers and resolves a model registration', () => {
    const slice = createModelSlice('things', { idKey: 'id' });
    const reg = { gateway: new Gateway('/things'), sliceName: 'things', actions: slice.actions, idKey: 'id' };
    modelRegistry.register(Thing, reg);
    expect(modelRegistry.resolve(Thing)).toBe(reg);
  });

  it('throws for an unregistered model', () => {
    class Unknown {}
    expect(() => modelRegistry.resolve(Unknown)).toThrow(/not registered/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @sublime-ui/framework`
Expected: FAIL — cannot resolve `../src/discovery/modelRegistry.js`.

- [ ] **Step 3: Write the implementation**

`framework/src/discovery/modelRegistry.ts`:
```ts
import type { Gateway } from '../gateway/Gateway.js';
import type { ModelSlice } from '../store/createModelSlice.js';

export interface ModelRegistration {
  gateway: Gateway;
  sliceName: string;
  actions: ModelSlice['actions'];
  idKey: string;
}

const registrations = new Map<Function, ModelRegistration>();

export const modelRegistry = {
  register(ctor: Function, reg: ModelRegistration): void {
    registrations.set(ctor, reg);
  },
  resolve(ctor: Function): ModelRegistration {
    const reg = registrations.get(ctor);
    if (!reg) {
      throw new Error(
        `Model "${ctor.name}" is not registered. Call registerModel(${ctor.name}) after defining it.`,
      );
    }
    return reg;
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w @sublime-ui/framework`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add framework/src/discovery/modelRegistry.ts framework/test/modelRegistry.test.ts
git commit -m "feat(framework): add model discovery registry"
```

---

## Task 13: `Model` base — construction, casting, CRUD commands, `call`

**Files:**
- Create: `framework/src/model/Model.ts`
- Test: `framework/test/Model.commands.test.ts`

**Interfaces:**
- Consumes: `modelRegistry` (Task 11), `store` (Task 9), `hydrate`/`toPlain` (Task 6), `ModelCollection` (Task 7), `ApiError` (Task 2), `RequestConfig` (Task 4).
- Produces (the `Model` base):
  - `constructor(attrs?: Record<string, unknown>)` — `Object.assign(this, attrs)`.
  - `static make<T extends Model>(this: ModelCtor<T>, attrs: Partial<T>): T`
  - `static resource: string` (subclass sets it).
  - `static all<T extends Model>(this: ModelCtor<T>, query?: Record<string, string | number>): Promise<ModelCollection<T>>` — `gateway.index` → cast → `setItems` → return collection.
  - `static find<T extends Model>(this: ModelCtor<T>, id: string | number): Promise<T | null>` — `gateway.show` → cast → `upsertItem` → instance, or `null` on 404.
  - `save(): Promise<this>` — create (no id) or update (has id) → `upsertItem`.
  - `delete(): Promise<void>` — `gateway.destroy` → `removeItem`.
  - `static call<R>(this: ModelCtor<Model>, config: CallConfig<R>): Promise<R>` where `CallConfig<R> = RequestConfig & { store?: boolean; merge?: 'replace' | 'upsert' | 'remove'; select?: (data: unknown) => unknown }`. `store:false` returns `data` (run through `select` if given) without touching Redux; `store:true` casts + dispatches per `merge` (default `replace`).
  - Helper types: `type ModelCtor<T> = (new (attrs?: Record<string, unknown>) => T) & typeof Model`.
  - All commands reject with `ApiError`; on error they also dispatch `setError` for the model's slice and log via `console.error`.

- [ ] **Step 1: Write the failing test** (uses a real registered model + mock fetch)

`framework/test/Model.commands.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Model } from '../src/model/Model.js';
import { ModelCollection } from '../src/model/ModelCollection.js';
import { ApiError } from '../src/gateway/ApiError.js';
import { registerModel } from '../src/register.js';
import { store } from '../src/store/store.js';
import { configureSublime, resetConfig } from '../src/config/Config.js';

class Widget extends Model {
  protected static override resource = '/widgets';
  declare id: number;
  declare name: string;
  get shout(): string { return this.name.toUpperCase(); }
}
registerModel(Widget);

function respond(json: unknown, status = 200) {
  vi.stubGlobal('fetch', async () => ({ ok: status < 300, status, json: async () => json } as Response));
}

describe('Model commands', () => {
  beforeEach(() => {
    resetConfig();
    configureSublime({
      baseURL: 'https://api.example.com',
      tokenProvider: async () => null,
      storageAdapter: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} },
      platform: 'web',
    });
    store.dispatch({ type: 'widgets/reset' });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('all() fetches, hydrates, caches plain JSON, returns a collection', async () => {
    respond({ success: true, message: '', data: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }], errors: null });
    const widgets = await Widget.all();
    expect(widgets).toBeInstanceOf(ModelCollection);
    expect(widgets.first()).toBeInstanceOf(Widget);
    expect(widgets.first()!.shout).toBe('A');
    const state = store.getState() as Record<string, { items: unknown[] }>;
    expect(state['widgets']!.items).toEqual([{ id: 1, name: 'a' }, { id: 2, name: 'b' }]);
    // store holds plain objects, not Widget instances
    expect(state['widgets']!.items[0]).not.toBeInstanceOf(Widget);
  });

  it('find() returns a hydrated instance and upserts', async () => {
    respond({ success: true, message: '', data: { id: 5, name: 'z' }, errors: null });
    const w = await Widget.find(5);
    expect(w).toBeInstanceOf(Widget);
    expect(w!.name).toBe('z');
  });

  it('save() POSTs a new instance and caches it', async () => {
    respond({ success: true, message: '', data: { id: 9, name: 'new' }, errors: null });
    const w = await Widget.make({ name: 'new' }).save();
    expect(w.id).toBe(9);
    const state = store.getState() as Record<string, { items: { id: number }[] }>;
    expect(state['widgets']!.items.some((i) => i.id === 9)).toBe(true);
  });

  it('call({ store:false }) returns data and does NOT touch the store', async () => {
    respond({ success: true, message: '', data: { count: 42 }, errors: null });
    const report = await Widget.call<{ count: number }>({ url: '/widgets/report', store: false });
    expect(report).toEqual({ count: 42 });
    const state = store.getState() as Record<string, { items: unknown[] }>;
    expect(state['widgets']!.items).toEqual([]);
  });

  it('rejects with ApiError and records slice error on failure', async () => {
    respond({ success: false, message: 'boom', data: null, errors: { x: ['y'] } }, 500);
    await expect(Widget.all()).rejects.toBeInstanceOf(ApiError);
    const state = store.getState() as Record<string, { error: { status: number } | null }>;
    expect(state['widgets']!.error?.status).toBe(500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @sublime-ui/framework`
Expected: FAIL — cannot resolve `../src/model/Model.js`.

> Note: this test imports `registerModel` from Task 12 (already landed) and `store` from Task 9. Both exist by the time this task runs.

- [ ] **Step 3: Write the implementation**

`framework/src/model/Model.ts`:
```ts
import { modelRegistry } from '../discovery/modelRegistry.js';
import { store } from '../store/store.js';
import { hydrate, toPlain } from './cast.js';
import { ModelCollection } from './ModelCollection.js';
import { ApiError } from '../gateway/ApiError.js';
import type { RequestConfig } from '../gateway/http.js';

export type ModelCtor<T extends Model> = (new (
  attrs?: Record<string, unknown>,
) => T) &
  typeof Model;

export interface CallConfig<R> extends RequestConfig {
  store?: boolean;
  merge?: 'replace' | 'upsert' | 'remove';
  select?: (data: unknown) => R;
}

export class Model {
  protected static resource: string;

  constructor(attrs: Record<string, unknown> = {}) {
    Object.assign(this, attrs);
  }

  static make<T extends Model>(this: ModelCtor<T>, attrs: Partial<T>): T {
    return new this(attrs as Record<string, unknown>);
  }

  /** Resolves this model's gateway/slice/actions from the registry. */
  private static reg() {
    return modelRegistry.resolve(this);
  }

  private static fail(error: unknown): never {
    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError(error instanceof Error ? error.message : 'Unknown error', {
            status: 0,
            errors: error,
            url: this.resource ?? '',
          });
    // eslint-disable-next-line no-console
    console.error(`[${this.name}] ${apiError.message}`, apiError);
    store.dispatch(this.reg().actions.setError(apiError));
    throw apiError;
  }

  static async all<T extends Model>(
    this: ModelCtor<T>,
    query?: Record<string, string | number>,
  ): Promise<ModelCollection<T>> {
    const reg = (this as typeof Model).reg();
    try {
      store.dispatch(reg.actions.setStatus('loading'));
      const res = await reg.gateway.index<Record<string, unknown>[]>(query);
      store.dispatch(reg.actions.setItems(res.data));
      return new ModelCollection<T>(res.data.map((p) => hydrate(this, p)));
    } catch (error) {
      return (this as typeof Model).fail(error);
    }
  }

  static async find<T extends Model>(
    this: ModelCtor<T>,
    id: string | number,
  ): Promise<T | null> {
    const reg = (this as typeof Model).reg();
    try {
      const res = await reg.gateway.show<Record<string, unknown>>(id);
      store.dispatch(reg.actions.upsertItem(res.data));
      return hydrate(this, res.data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      return (this as typeof Model).fail(error);
    }
  }

  async save(): Promise<this> {
    const ctor = this.constructor as typeof Model;
    const reg = ctor.reg();
    const plain = toPlain(this);
    const id = plain[reg.idKey];
    try {
      const res =
        id === undefined || id === null
          ? await reg.gateway.create<Record<string, unknown>>(plain)
          : await reg.gateway.update<Record<string, unknown>>(
              id as string | number,
              plain,
            );
      store.dispatch(reg.actions.upsertItem(res.data));
      Object.assign(this, res.data);
      return this;
    } catch (error) {
      return ctor.fail(error);
    }
  }

  async delete(): Promise<void> {
    const ctor = this.constructor as typeof Model;
    const reg = ctor.reg();
    const id = (toPlain(this) as Record<string, unknown>)[reg.idKey];
    try {
      if (id !== undefined && id !== null) {
        await reg.gateway.destroy(id as string | number);
        store.dispatch(reg.actions.removeItem(id as string | number));
      }
    } catch (error) {
      ctor.fail(error);
    }
  }

  static async call<R>(this: ModelCtor<Model>, config: CallConfig<R>): Promise<R> {
    const reg = (this as typeof Model).reg();
    try {
      const res = await reg.gateway.request<unknown>(config);
      const payload = (config.select ? config.select(res.data) : res.data) as R;
      if (config.store) {
        const merge = config.merge ?? 'replace';
        const rows = (Array.isArray(payload) ? payload : [payload]) as Record<
          string,
          unknown
        >[];
        if (merge === 'replace') store.dispatch(reg.actions.setItems(rows));
        else if (merge === 'upsert') store.dispatch(reg.actions.upsertItems(rows));
        else for (const r of rows) store.dispatch(reg.actions.removeItem(r[reg.idKey] as string | number));
      }
      return payload;
    } catch (error) {
      return (this as typeof Model).fail(error);
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w @sublime-ui/framework`
Expected: PASS (all 5 command specs; store holds plain JSON).

- [ ] **Step 5: Run typecheck + lint**

Run: `npm run typecheck -w @sublime-ui/framework && npm run lint -w @sublime-ui/framework`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add framework/src/model/Model.ts framework/test/Model.commands.test.ts
git commit -m "feat(framework): add Model base with CRUD commands and call()"
```

---

## Task 14: `Model` reactive reads — `rxAll` / `rxFind`

**Files:**
- Modify: `framework/src/model/Model.ts` (append `rxAll`/`rxFind`)
- Create: `framework/src/test-utils/renderRx.tsx`
- Test: `framework/test/Model.rx.test.tsx`

**Interfaces:**
- Consumes: `useAppSelector`/`useAppDispatch` (Task 10), `store` (Task 9), `hydrate` (Task 6), `ModelCollection` (Task 7), the Task 12 `Model`.
- Produces (added to `Model`):
  - `static rxAll<T extends Model>(this: ModelCtor<T>, query?: Record<string, string | number>): ModelCollection<T>` — reactive; reads the model's slice via `useAppSelector`, hydrates items into a `ModelCollection` carrying `loading`/`error`/`refetch`; if slice `status === 'idle'`, triggers `this.all(query)` once via `useEffect`.
  - `static rxFind<T extends Model>(this: ModelCtor<T>, id: string | number): T | null` — reactive single; triggers `this.find(id)` when the item is absent and status is `idle`.

- [ ] **Step 1: Write the render helper**

`framework/src/test-utils/renderRx.tsx`:
```tsx
import { createElement, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { renderHook, type RenderHookResult } from '@testing-library/react';
import { store } from '../store/store.js';

/** renderHook wrapped in the framework's Redux Provider. */
export function renderRx<R>(hook: () => R): RenderHookResult<R, void> {
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(Provider, { store, children });
  return renderHook(hook, { wrapper });
}
```

- [ ] **Step 2: Write the failing test**

`framework/test/Model.rx.test.tsx`:
```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { Model } from '../src/model/Model.js';
import { ModelCollection } from '../src/model/ModelCollection.js';
import { registerModel } from '../src/register.js';
import { store } from '../src/store/store.js';
import { configureSublime, resetConfig } from '../src/config/Config.js';
import { renderRx } from '../src/test-utils/renderRx.js';

class Gadget extends Model {
  protected static override resource = '/gadgets';
  declare id: number;
  declare label: string;
}
registerModel(Gadget);

describe('Model rx reads', () => {
  beforeEach(() => {
    resetConfig();
    configureSublime({
      baseURL: 'https://api.example.com',
      tokenProvider: async () => null,
      storageAdapter: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} },
      platform: 'web',
    });
    store.dispatch({ type: 'gadgets/reset' });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('rxAll auto-fetches on idle, then serves a reactive hydrated collection', async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true, status: 200,
      json: async () => ({ success: true, message: '', data: [{ id: 1, label: 'x' }], errors: null }),
    } as Response));
    vi.stubGlobal('fetch', fetchSpy);

    const { result } = renderRx(() => Gadget.rxAll());
    expect(result.current).toBeInstanceOf(ModelCollection);
    expect(result.current.loading).toBe(true); // idle → kicked off a fetch

    await waitFor(() => expect(result.current.length).toBe(1));
    expect(result.current.first()).toBeInstanceOf(Gadget);
    expect(result.current.first()!.label).toBe('x');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('rxAll serves cache without refetching when already loaded', async () => {
    store.dispatch({ type: 'gadgets/setItems', payload: [{ id: 2, label: 'cached' }] });
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const { result } = renderRx(() => Gadget.rxAll());
    expect(result.current.length).toBe(1);
    expect(result.current.first()!.label).toBe('cached');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -w @sublime-ui/framework`
Expected: FAIL — `rxAll` is not a function on `Gadget`.

- [ ] **Step 4: Append `rxAll`/`rxFind` to `Model.ts`** (add the import line and the two static methods inside the class)

Add to the imports at the top of `framework/src/model/Model.ts`:
```ts
import { useEffect } from 'react';
import { useAppSelector } from '../store/hooks.js';
import type { ModelSliceState } from '../store/createModelSlice.js';
```

Add these methods inside the `Model` class (after `call`):
```ts
  static rxAll<T extends Model>(
    this: ModelCtor<T>,
    query?: Record<string, string | number>,
  ): ModelCollection<T> {
    const ctor = this as typeof Model;
    const reg = ctor.reg();
    const slice = useAppSelector(
      (s) => s[reg.sliceName],
    ) as ModelSliceState | undefined;
    const status = slice?.status ?? 'idle';
    const items = slice?.items ?? [];

    useEffect(() => {
      if (status === 'idle') void ctor.all.call(this, query);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    return new ModelCollection<T>(
      items.map((p) => hydrate(this, p)),
      {
        loading: status === 'idle' || status === 'loading',
        error: slice?.error ?? null,
        refetch: () => void ctor.all.call(this, query),
      },
    );
  }

  static rxFind<T extends Model>(
    this: ModelCtor<T>,
    id: string | number,
  ): T | null {
    const ctor = this as typeof Model;
    const reg = ctor.reg();
    const slice = useAppSelector(
      (s) => s[reg.sliceName],
    ) as ModelSliceState | undefined;
    const status = slice?.status ?? 'idle';
    const found = (slice?.items ?? []).find((p) => p[reg.idKey] === id);

    useEffect(() => {
      if (!found && status === 'idle') void ctor.find.call(this, id);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, id]);

    return found ? hydrate(this, found) : null;
  }
```

> Note: `rxAll`/`rxFind` are React hooks (they call `useAppSelector`/`useEffect`), so they must be called from component render, per the Rules of Hooks. This is documented in `Model.ts` with a comment.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -w @sublime-ui/framework`
Expected: PASS (both rx specs).

- [ ] **Step 6: Typecheck + lint**

Run: `npm run typecheck -w @sublime-ui/framework && npm run lint -w @sublime-ui/framework`
Expected: PASS. (If ESLint lacks the `react-hooks` plugin, the disable comments are harmless; if it flags unknown rule, remove those comment lines.)

- [ ] **Step 7: Commit**

```bash
git add framework/src/model/Model.ts framework/src/test-utils/renderRx.tsx framework/test/Model.rx.test.tsx
git commit -m "feat(framework): add reactive rxAll/rxFind model reads"
```

---

## Task 12: `registerModel` — the glue that wires a model end-to-end

**Files:**
- Create: `framework/src/register.ts`
- Test: `framework/test/register.test.ts`

**Interfaces:**
- Consumes: `Gateway` (Task 5), `createModelSlice` (Task 8), `registerReducer` (Task 9), `modelRegistry` (Task 11).
- Produces:
  - `registerModel(ModelClass: { name: string; resource?: string }, opts?: { name?: string; idKey?: string }): void` — derives a slice name (`opts.name` ?? lowercased class name + `'s'`), `idKey` (`opts.idKey` ?? `'id'`), creates a `Gateway(resource)` + `createModelSlice(name, { idKey })`, registers the reducer into the store, and registers the discovery entry. Throws if `resource` is missing.

- [ ] **Step 1: Write the failing test**

`framework/test/register.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { registerModel } from '../src/register.js';
import { modelRegistry } from '../src/discovery/modelRegistry.js';
import { store } from '../src/store/store.js';

class Invoice {
  static resource = '/invoices';
}

describe('registerModel', () => {
  it('wires gateway + slice + reducer + discovery', () => {
    registerModel(Invoice as unknown as { name: string; resource?: string });
    const reg = modelRegistry.resolve(Invoice);
    expect(reg.sliceName).toBe('invoices');
    expect(reg.idKey).toBe('id');
    // reducer is registered → store has the slice after a dispatch
    store.dispatch(reg.actions.setItems([{ id: 1 }]));
    const state = store.getState() as Record<string, { items: unknown[] }>;
    expect(state['invoices']!.items).toEqual([{ id: 1 }]);
  });

  it('throws when resource is missing', () => {
    class NoResource {}
    expect(() =>
      registerModel(NoResource as unknown as { name: string; resource?: string }),
    ).toThrow(/resource/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @sublime-ui/framework`
Expected: FAIL — cannot resolve `../src/register.js`.

- [ ] **Step 3: Write the implementation**

`framework/src/register.ts`:
```ts
import { Gateway } from './gateway/Gateway.js';
import { createModelSlice } from './store/createModelSlice.js';
import { registerReducer } from './store/store.js';
import { modelRegistry } from './discovery/modelRegistry.js';

export function registerModel(
  ModelClass: { name: string; resource?: string },
  opts: { name?: string; idKey?: string } = {},
): void {
  const resource = ModelClass.resource;
  if (!resource) {
    throw new Error(
      `Model "${ModelClass.name}" is missing a static "resource" (e.g. protected static resource = '/users').`,
    );
  }
  const sliceName = opts.name ?? `${ModelClass.name.toLowerCase()}s`;
  const idKey = opts.idKey ?? 'id';

  const gateway = new Gateway(resource);
  const slice = createModelSlice(sliceName, { idKey });
  registerReducer(slice.name, slice.reducer);
  modelRegistry.register(ModelClass as unknown as Function, {
    gateway,
    sliceName,
    actions: slice.actions,
    idKey,
  });
}
```

> Note: `resource` is `protected static` on subclasses; it is still readable at runtime (TS `protected` is compile-time only). `registerModel` is called with the concrete subclass, which has access.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w @sublime-ui/framework`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add framework/src/register.ts framework/test/register.test.ts
git commit -m "feat(framework): add registerModel wiring helper"
```

---

## Task 15: Public exports + end-to-end integration proof

**Files:**
- Create: `framework/src/index.ts` (replace the stub)
- Modify: `framework/tsup.config.ts` (ensure `src/index.ts` entry — already the default)
- Test: `framework/test/integration.test.ts`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: the package's public surface and a full end-to-end test mirroring real usage.

- [ ] **Step 1: Write `index.ts`**

`framework/src/index.ts`:
```ts
export { Model } from './model/Model.js';
export { ModelCollection } from './model/ModelCollection.js';
export type { CallConfig, ModelCtor } from './model/Model.js';
export { registerModel } from './register.js';
export {
  configureSublime,
  getConfig,
  type SublimeConfig,
  type StorageAdapter,
} from './config/Config.js';
export { ApiError } from './gateway/ApiError.js';
export { Gateway } from './gateway/Gateway.js';
export type { ApiResponse } from './entities/ApiResponse.js';
export { store, registerReducer } from './store/store.js';
export type { RootState, AppDispatch } from './store/store.js';
export { useAppDispatch, useAppSelector } from './store/hooks.js';
```

- [ ] **Step 2: Write the end-to-end integration test**

`framework/test/integration.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Model, registerModel, configureSublime, store } from '../src/index.js';
import { resetConfig } from '../src/config/Config.js';

class User extends Model {
  protected static override resource = '/users';
  declare id: number;
  declare name: string;
  declare licenceExpiresAt: string;
  get hasExpiredLicence(): boolean {
    return new Date(this.licenceExpiresAt) < new Date('2026-06-18');
  }
  static expired() {
    return this.call<User[]>({ url: '/users/expired', store: true, merge: 'replace' });
  }
}
registerModel(User);

describe('framework end-to-end (hand-written model)', () => {
  beforeEach(() => {
    resetConfig();
    configureSublime({
      baseURL: 'https://api.example.com',
      tokenProvider: async () => 'tok',
      storageAdapter: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} },
      platform: 'mobile',
    });
    store.dispatch({ type: 'users/reset' });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('loads, caches plain JSON, hydrates getters, and passes a custom store:true call', async () => {
    vi.stubGlobal('fetch', async (url: string) => {
      const data = url.endsWith('/expired')
        ? [{ id: 3, name: 'old', licenceExpiresAt: '2020-01-01' }]
        : [
            { id: 1, name: 'a', licenceExpiresAt: '2030-01-01' },
            { id: 2, name: 'b', licenceExpiresAt: '2020-01-01' },
          ];
      return { ok: true, status: 200, json: async () => ({ success: true, message: '', data, errors: null }) } as Response;
    });

    const users = await User.all();
    expect(users.length).toBe(2);
    expect(users.where('hasExpiredLicence', true).map((u) => u.id)).toEqual([2]);

    // store holds plain objects only
    const state = store.getState() as Record<string, { items: unknown[] }>;
    expect(state['users']!.items[0]).not.toBeInstanceOf(User);
    expect(Object.getPrototypeOf(state['users']!.items[0])).toBe(Object.prototype);

    const expired = await User.expired();
    expect(expired.map((u) => u.id)).toEqual([3]);
    expect(state['users']).toBeDefined();
  });
});
```

- [ ] **Step 3: Run the full framework suite**

Run: `npm run test -w @sublime-ui/framework`
Expected: PASS — every spec across Tasks 1–15.

- [ ] **Step 4: Full monorepo gate**

Run from repo root:
```bash
npm run typecheck && npm run lint && npm run test && npm run build
```
Expected: all green; `framework/dist` emits `index.js` + `index.d.ts`; core has no RN/DOM imports in `src/` (only `react`/`react-redux`/`@reduxjs/toolkit`).

- [ ] **Step 5: Commit**

```bash
git add framework/src/index.ts framework/test/integration.test.ts
git commit -m "feat(framework): export public API and add end-to-end integration proof"
```

---

## Self-Review notes (author)

- **Spec coverage:** Model + declare-field usage (Tasks 12,13,15 example models use `declare` fields + getters); `Gateway`/`http`/`ApiError` (Tasks 2,4,5); commands throw `ApiError`, visible + slice error (Task 12); `rxAll`/`rxFind` cache-first auto-fetch (Task 13); `this.call({ url, store, merge, select })` primitive incl. `store:false` passthrough (Task 12); casting keeps store plain JSON, asserted (Tasks 6,12,15); auto-registering slice + dynamic store (Tasks 8,9,14); discovery (Task 11); `Config` platform seam (Task 3); `ApiResponse` (Task 2); cross-platform (no RN/DOM imports — Task 15 gate). Scope line: generator deferred to #3 (this plan ships only the hand-written path + `registerModel`).
- **Cross-task coupling:** `Model.commands.test` (Task 13) and `Model.rx.test` (Task 14) import `registerModel` from Task 12 and `store` from Task 9 — both land first, so the plan runs cleanly in natural order 1→2→…→15. `Model.rx` (Task 14) appends to `Model.ts` created in Task 13.
- **Type consistency:** `ModelRegistration` (`gateway`, `sliceName`, `actions`, `idKey`) is produced in Task 11 and consumed identically in Tasks 12/13/14. `createModelSlice` action names (`setItems`/`upsertItem`/`upsertItems`/`removeItem`/`setActive`/`setStatus`/`setError`/`reset`) are used verbatim in Model/register. `ModelCollection` constructor `(items, meta?)` matches all call sites. `hydrate(ctor, plain)` / `toPlain(instance)` signatures match.
- **Known risks for execution:** (a) polymorphic `this` static typing on `Model` is intricate — if TS fights the `ModelCtor<T>` casts, the implementer may need small `this`-type adjustments (behavior covered by tests). (b) RTK `serializableCheck` for `error` path is handled via `ignoredPaths: ['*.error']`. (c) `rxAll` calling `this.all` inside `useEffect` must not loop — guarded by `status === 'idle'` and the `setStatus('loading')` transition in `all()`.
