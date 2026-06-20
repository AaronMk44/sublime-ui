### Task A1: DataError tree (errors/ package)

**Files:**
- Create: `framework/src/errors/DataError.ts`
- Create: `framework/src/errors/NetworkError.ts`
- Create: `framework/src/errors/AuthError.ts`
- Create: `framework/src/errors/ValidationError.ts`
- Create: `framework/src/errors/NotFoundError.ts`
- Create: `framework/src/errors/ConfigError.ts`
- Create: `framework/src/errors/StorageError.ts`
- Create: `framework/src/errors/index.ts`
- Test: `framework/test/errors.test.ts`

**Interfaces:**
- Consumes: `Id` (`string | number`) — re-declared locally as a structural type in `NotFoundError.ts` to keep `errors/` free of a `gateway/` dependency (the canonical `Id` lives in `gateway/Gateway.ts`; `NotFoundError.id` is typed `string | number | undefined`, structurally identical).
- Produces: `DataErrorCode` (`'http'|'network'|'auth'|'validation'|'not_found'|'config'|'storage'|'unsupported'|'unknown'`); `DataError` (base: `readonly code: DataErrorCode`, `readonly cause?: unknown`, `constructor(message: string, opts?: { code?: DataErrorCode; cause?: unknown })`); `NetworkError` (`readonly url?: string`); `AuthError` (`readonly status?: number`); `ValidationError` (`readonly fields?: unknown`, reserved); `NotFoundError` (`readonly resource?: string`, `readonly id?: string | number`); `ConfigError`; `StorageError`. All subtypes extend `DataError` directly. Barrel `errors/index.ts` re-exports every class + `DataErrorCode`.

- [ ] **Step 1: Write the failing test**
```ts
// framework/test/errors.test.ts
import { describe, it, expect } from 'vitest';
import {
  DataError,
  NetworkError,
  AuthError,
  ValidationError,
  NotFoundError,
  ConfigError,
  StorageError,
  type DataErrorCode,
} from '../src/errors/index.js';

describe('DataError tree', () => {
  it('DataError is an Error with default code "unknown" and no cause', () => {
    const err = new DataError('boom');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(DataError);
    expect(err.name).toBe('DataError');
    expect(err.message).toBe('boom');
    expect(err.code).toBe('unknown');
    expect(err.cause).toBeUndefined();
  });

  it('DataError honors an explicit code and propagates cause', () => {
    const root = new Error('root');
    const err = new DataError('wrapped', { code: 'storage', cause: root });
    expect(err.code).toBe('storage');
    expect(err.cause).toBe(root);
  });

  it('every subclass is instanceof DataError and instanceof Error (new.target fix)', () => {
    const subclasses: Array<[DataError, DataErrorCode, string]> = [
      [new NetworkError('n'), 'network', 'NetworkError'],
      [new AuthError('a'), 'auth', 'AuthError'],
      [new ValidationError('v'), 'validation', 'ValidationError'],
      [new NotFoundError('nf'), 'not_found', 'NotFoundError'],
      [new ConfigError('c'), 'config', 'ConfigError'],
      [new StorageError('s'), 'storage', 'StorageError'],
    ];
    for (const [err, code, name] of subclasses) {
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(DataError);
      expect(err.name).toBe(name);
      expect(err.code).toBe(code);
    }
  });

  it('NetworkError carries an optional url', () => {
    const err = new NetworkError('offline', { url: 'https://api.example.com/users' });
    expect(err).toBeInstanceOf(DataError);
    expect(err.url).toBe('https://api.example.com/users');
  });

  it('AuthError carries an optional status', () => {
    const err = new AuthError('forbidden', { status: 403 });
    expect(err.status).toBe(403);
  });

  it('ValidationError carries optional fields (reserved for SP3)', () => {
    const err = new ValidationError('invalid', { fields: { title: ['required'] } });
    expect(err.fields).toEqual({ title: ['required'] });
  });

  it('NotFoundError carries optional resource and id', () => {
    const err = new NotFoundError('notes#7 not found', { resource: 'notes', id: 7 });
    expect(err.resource).toBe('notes');
    expect(err.id).toBe(7);
  });

  it('ConfigError and StorageError default to their fixed codes', () => {
    expect(new ConfigError('missing baseURL').code).toBe('config');
    expect(new StorageError('driver failed').code).toBe('storage');
  });

  it('cause propagates through a subclass constructor', () => {
    const root = new Error('disk full');
    const err = new StorageError('insert failed', { cause: root });
    expect(err.cause).toBe(root);
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/errors.test.ts`
Expected: FAIL with "Failed to resolve import '../src/errors/index.js'" (the `errors/` directory does not exist yet).

- [ ] **Step 3: Create the DataError base and subclasses (complete code)**

Create `framework/src/errors/DataError.ts`:
```ts
export type DataErrorCode =
  | 'http'
  | 'network'
  | 'auth'
  | 'validation'
  | 'not_found'
  | 'config'
  | 'storage'
  | 'unsupported'
  | 'unknown';

export interface DataErrorOptions {
  code?: DataErrorCode;
  cause?: unknown;
}

/**
 * Transport-neutral base error. Every real framework data-layer failure is a
 * DataError (or a subclass); absence is never a failure (find/show return null).
 *
 * Uses `new.target.prototype` so subclass `instanceof` works under transpiled
 * `extends Error` targets — fixes the latent bug where a fixed
 * `Object.setPrototypeOf(this, DataError.prototype)` would break subclass checks.
 */
export class DataError extends Error {
  readonly code: DataErrorCode;
  readonly cause?: unknown;

  constructor(message: string, opts: DataErrorOptions = {}) {
    super(message);
    this.name = new.target.name;
    this.code = opts.code ?? 'unknown';
    if (opts.cause !== undefined) this.cause = opts.cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
```

Create `framework/src/errors/NetworkError.ts`:
```ts
import { DataError } from './DataError.js';

export interface NetworkErrorOptions {
  url?: string;
  cause?: unknown;
}

/** Connection-level failure: DNS error, offline, connection refused, fetch reject. */
export class NetworkError extends DataError {
  readonly url?: string;

  constructor(message: string, opts: NetworkErrorOptions = {}) {
    super(message, { code: 'network', cause: opts.cause });
    if (opts.url !== undefined) this.url = opts.url;
  }
}
```

Create `framework/src/errors/AuthError.ts`:
```ts
import { DataError } from './DataError.js';

export interface AuthErrorOptions {
  status?: number;
  cause?: unknown;
}

/** Authentication / authorization failure: HTTP 401 / 403. */
export class AuthError extends DataError {
  readonly status?: number;

  constructor(message: string, opts: AuthErrorOptions = {}) {
    super(message, { code: 'auth', cause: opts.cause });
    if (opts.status !== undefined) this.status = opts.status;
  }
}
```

Create `framework/src/errors/ValidationError.ts`:
```ts
import { DataError } from './DataError.js';

export interface ValidationErrorOptions {
  fields?: unknown;
  cause?: unknown;
}

/** RESERVED for SP3 (per-field server validation). Thrown nowhere in SP1. */
export class ValidationError extends DataError {
  readonly fields?: unknown;

  constructor(message: string, opts: ValidationErrorOptions = {}) {
    super(message, { code: 'validation', cause: opts.cause });
    if (opts.fields !== undefined) this.fields = opts.fields;
  }
}
```

Create `framework/src/errors/NotFoundError.ts`:
```ts
import { DataError } from './DataError.js';

export interface NotFoundErrorOptions {
  resource?: string;
  id?: string | number;
  cause?: unknown;
}

/**
 * Thrown by update-of-missing across all three strategies. NOT thrown by
 * find/show — genuine read absence resolves to null.
 */
export class NotFoundError extends DataError {
  readonly resource?: string;
  readonly id?: string | number;

  constructor(message: string, opts: NotFoundErrorOptions = {}) {
    super(message, { code: 'not_found', cause: opts.cause });
    if (opts.resource !== undefined) this.resource = opts.resource;
    if (opts.id !== undefined) this.id = opts.id;
  }
}
```

Create `framework/src/errors/ConfigError.ts`:
```ts
import { DataError, type DataErrorOptions } from './DataError.js';

/** Missing required configuration: baseURL (HTTP) or databaseAdapter (DB). */
export class ConfigError extends DataError {
  constructor(message: string, opts: Omit<DataErrorOptions, 'code'> = {}) {
    super(message, { code: 'config', cause: opts.cause });
  }
}
```

Create `framework/src/errors/StorageError.ts`:
```ts
import { DataError, type DataErrorOptions } from './DataError.js';

/** DB driver / transport failure: duplicate id, missing JSON1, IPC error. */
export class StorageError extends DataError {
  constructor(message: string, opts: Omit<DataErrorOptions, 'code'> = {}) {
    super(message, { code: 'storage', cause: opts.cause });
  }
}
```

Create `framework/src/errors/index.ts`:
```ts
export { DataError, type DataErrorCode, type DataErrorOptions } from './DataError.js';
export { NetworkError, type NetworkErrorOptions } from './NetworkError.js';
export { AuthError, type AuthErrorOptions } from './AuthError.js';
export { ValidationError, type ValidationErrorOptions } from './ValidationError.js';
export { NotFoundError, type NotFoundErrorOptions } from './NotFoundError.js';
export { ConfigError } from './ConfigError.js';
export { StorageError } from './StorageError.js';
```

- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/errors.test.ts`
Expected: PASS (all 8 cases green).

- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add framework/src/errors framework/test/errors.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "feat(framework): add transport-neutral DataError tree"
```

---

### Task A2: Rename ApiError -> HttpError + back-compat shim

**Files:**
- Create: `framework/src/gateway/HttpError.ts`
- Modify: `framework/src/gateway/ApiError.ts:1-21` (rewrite entire file into a shim)
- Modify: `framework/test/ApiError.test.ts:1-19` (migrate name + add DataError instanceof)
- Test: `framework/test/ApiError.test.ts`

**Interfaces:**
- Consumes: `DataError` (base class from `errors/DataError.ts`); `DataErrorCode`.
- Produces: `HttpError` (`extends DataError`; `readonly status: number`, `readonly url: string`, `readonly errors: unknown`; `code` defaults to `'http'`; `constructor(message: string, opts: HttpErrorOptions)`); `HttpErrorOptions` (`{ status: number; errors: unknown; url: string; cause?: unknown }`). Shim `gateway/ApiError.ts` re-exports `{ HttpError, HttpError as ApiError }` plus type aliases `ApiError = HttpError` and `ApiErrorOptions = HttpErrorOptions`, so `new ApiError(...).name === 'HttpError'` and `instanceof ApiError` keeps working.

> NOTE: `http.ts` still imports `ApiError` from `./ApiError.js` after this task — that import resolves through the shim and keeps compiling/passing. The `http.ts` re-classification (NetworkError / AuthError / ValidationError mapping, raw `T` return) is Phase D and is intentionally NOT done here. This task changes only the error class identity, not call sites.

Current `framework/src/gateway/ApiError.ts` (the file being replaced) is 21 lines: `ApiErrorOptions` interface (lines 1-5), `class ApiError extends Error` with `status`/`errors`/`url` (lines 7-21), `this.name = 'ApiError'` (line 15), and the latent subclass-`instanceof` bug `Object.setPrototypeOf(this, ApiError.prototype)` (line 19). The new `HttpError` extends `DataError` and uses `new.target.prototype` (inherited from the base), curing that bug.

- [ ] **Step 1: Write the failing test (migrate ApiError.test.ts)**
```ts
// framework/test/ApiError.test.ts
import { describe, it, expect } from 'vitest';
import { ApiError } from '../src/gateway/ApiError.js';
import { HttpError } from '../src/gateway/HttpError.js';
import { DataError } from '../src/errors/index.js';

describe('ApiError (back-compat shim for HttpError)', () => {
  it('is an Error/DataError/HttpError carrying status, errors, and url', () => {
    const err = new ApiError('Not found', {
      status: 404,
      errors: { id: ['missing'] },
      url: '/users/1',
    });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(DataError);
    expect(err).toBeInstanceOf(HttpError);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.name).toBe('HttpError');
    expect(err.code).toBe('http');
    expect(err.message).toBe('Not found');
    expect(err.status).toBe(404);
    expect(err.errors).toEqual({ id: ['missing'] });
    expect(err.url).toBe('/users/1');
  });

  it('ApiError is the same value as HttpError', () => {
    expect(ApiError).toBe(HttpError);
  });

  it('HttpError propagates an optional cause', () => {
    const root = new Error('socket hang up');
    const err = new HttpError('upstream failed', {
      status: 502,
      errors: null,
      url: '/users',
      cause: root,
    });
    expect(err.cause).toBe(root);
    expect(err).toBeInstanceOf(DataError);
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/ApiError.test.ts`
Expected: FAIL with "Failed to resolve import '../src/gateway/HttpError.js'" (HttpError does not exist yet; the old `ApiError` also still has `name === 'ApiError'` and is not a `DataError`).

- [ ] **Step 3: Create HttpError and rewrite ApiError into a shim (complete code)**

Create `framework/src/gateway/HttpError.ts`:
```ts
import { DataError, type DataErrorCode } from '../errors/DataError.js';

export interface HttpErrorOptions {
  status: number;
  errors: unknown;
  url: string;
  cause?: unknown;
}

/**
 * "Came over the wire" error: a non-2xx HTTP response (or a malformed one).
 * Extends DataError with HTTP transport details. code defaults to 'http'.
 * Was the framework's former `ApiError` (now a back-compat alias).
 */
export class HttpError extends DataError {
  readonly status: number;
  readonly errors: unknown;
  readonly url: string;

  constructor(message: string, opts: HttpErrorOptions) {
    const code: DataErrorCode = 'http';
    super(message, { code, cause: opts.cause });
    this.status = opts.status;
    this.errors = opts.errors;
    this.url = opts.url;
  }
}
```

Replace the entire contents of `framework/src/gateway/ApiError.ts` (currently lines 1-21) with the shim:
```ts
/**
 * Back-compat shim. `ApiError` was renamed to `HttpError` in 0.2.0; this module
 * re-exports the new class under both names so existing imports and
 * `instanceof ApiError` keep working. The runtime `.name` is now 'HttpError'.
 */
export { HttpError, HttpError as ApiError } from './HttpError.js';
export type { HttpErrorOptions } from './HttpError.js';
export type { HttpErrorOptions as ApiErrorOptions } from './HttpError.js';
import type { HttpError as _HttpError } from './HttpError.js';
export type ApiError = _HttpError;
```

- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/ApiError.test.ts`
Expected: PASS (all 3 cases green; `ApiError` resolves to `HttpError`, `name === 'HttpError'`, `instanceof DataError` holds).

- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add framework/src/gateway/HttpError.ts framework/src/gateway/ApiError.ts framework/test/ApiError.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "refactor(framework): rename ApiError to HttpError with back-compat shim"
```
