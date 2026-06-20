### Task I1: getNative accessor + built-in `sqlite` native service (@sublime-ui/desktop)

**Files:**
- Create: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop/src/get-native.ts`
- Create: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop/src/services/sqlite.ts`
- Create: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop/src/services/get-better-sqlite3.ts`
- Modify: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop/src/use-native.ts:13-57`
- Modify: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop/src/client.ts:31-33`
- Modify: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop/src/index.ts:30-32,60-68`
- Modify: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop/src/services/index.ts:9-13`
- Modify: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop/package.json:25-39` (peerDependencies + add `./sqlite` export + sqlite-contract export)
- Test: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop/test/get-native.test.ts`
- Test: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop/test/services/sqlite.test.ts`
- Test (existing, extended): `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop/test/client-bundle-safety.test.ts:73-85`

**Interfaces:**
- Consumes: `createProxy<M>(mod, invoke)` (from `bridge/proxy.js`), `deserializeError(serialized)` + `SerializedError` (from `errors.js`), `NativeMethods` (from `types.js`), `defineNative(name, methods)` (from `define-native.js`).
- Produces:
  - `getNative<M extends NativeMethods>(name: string): M | null` — hook-free renderer accessor (returns the same typed proxy `useNative` returns, or `null` off-bridge). Exported from `./client` and the main barrel.
  - `sqlite` — a `NativeService` authored with `defineNative('sqlite', {...})`, main-only `better-sqlite3`, methods `exec(sql)`, `run(sql, params)`, `all(sql, params)`, `get(sql, params)`. Registerable via `registerNative([sqlite])`.
  - `SqliteContract` — a renderer-safe, type-only contract type (`typeof sqlite.methods`) exported from `@sublime-ui/desktop/sqlite-contract` (and re-exported as a `type` from the main barrel) so the renderer/storage driver can `import type` it without crossing into node/better-sqlite3.

- [ ] **Step 1: Write the failing test** — `getNative` proxy/null behaviour
```ts
// desktop/test/get-native.test.ts
import { afterEach, describe, it, expect, vi } from 'vitest';
import { getNative } from '../src/get-native';
import { NativeError, serializeError } from '../src/errors';

type Fs = {
  readFile: (path: string) => Promise<string>;
};

afterEach(() => {
  delete (globalThis as unknown as { sublimeNative?: unknown }).sublimeNative;
});

describe('getNative (hook-free)', () => {
  it('returns null on plain web (no globalThis.sublimeNative)', () => {
    expect(getNative<Fs>('fs')).toBeNull();
  });

  it('forwards calls through the bridge invoke', async () => {
    const invoke = vi.fn().mockResolvedValue('contents');
    (globalThis as unknown as { sublimeNative: { invoke: typeof invoke } }).sublimeNative = {
      invoke,
    };

    const proxy = getNative<Fs>('fs');
    expect(proxy).not.toBeNull();
    await expect(proxy!.readFile('/a.txt')).resolves.toBe('contents');
    expect(invoke).toHaveBeenCalledWith('fs', 'readFile', ['/a.txt']);
  });

  it('rethrows a {__nativeError} envelope as a NativeError', async () => {
    const envelope = {
      __nativeError: serializeError(
        Object.assign(new Error('boom'), { code: 'ENOENT' }),
      ),
    };
    const invoke = vi.fn().mockResolvedValue(envelope);
    (globalThis as unknown as { sublimeNative: { invoke: typeof invoke } }).sublimeNative = {
      invoke,
    };

    const proxy = getNative<Fs>('fs');
    await expect(proxy!.readFile('/missing.txt')).rejects.toBeInstanceOf(NativeError);
    await expect(proxy!.readFile('/missing.txt')).rejects.toMatchObject({
      message: 'boom',
      code: 'ENOENT',
    });
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop && npx vitest run test/get-native.test.ts`
Expected: FAIL — `Failed to resolve import "../src/get-native"` (the module does not exist yet).

- [ ] **Step 3: Create `get-native.ts`, refactor `use-native.ts` onto it, export it**

Create `desktop/src/get-native.ts` (the hook-free body factored out of `useNative`; pure — no node/electron, safe for `./client`):
```ts
// desktop/src/get-native.ts
/**
 * Hook-free accessor for a native service.
 *
 * The non-React twin of {@link useNative}: it reads the same
 * `globalThis.sublimeNative` bridge exposed by the preload and returns the same
 * typed {@link createProxy}, or `null` on plain web where no bridge ran. Use it
 * outside React — e.g. the `@sublime-ui/storage` desktop SQLite driver adapts
 * `getNative('sqlite')` to its driver port. `useNative` delegates here so the
 * proxy/error-revival semantics are defined in exactly one place.
 */

import { createProxy } from './bridge/proxy.js';
import { deserializeError } from './errors.js';
import type { SerializedError } from './errors.js';
import type { NativeMethods } from './types.js';

/** Shape of the bridge exposed at `globalThis.sublimeNative` by the preload. */
interface SublimeNativeWindow {
  invoke(mod: string, method: string, args: unknown[]): Promise<unknown>;
}

/** Envelope shape returned by the main router when a native call fails. */
interface NativeErrorEnvelope {
  __nativeError: SerializedError;
}

function isNativeErrorEnvelope(value: unknown): value is NativeErrorEnvelope {
  return typeof value === 'object' && value !== null && '__nativeError' in value;
}

/**
 * Access a native service by name without a React hook.
 *
 * @typeParam M the service's method map (from the `defineNative` author).
 * @param name  the registry key of the native service (e.g. `'sqlite'`).
 * @returns a typed proxy, or `null` when running outside the Electron shell.
 */
export function getNative<M extends NativeMethods>(name: string): M | null {
  const bridge = (globalThis as { sublimeNative?: SublimeNativeWindow }).sublimeNative;
  if (bridge === undefined) {
    return null;
  }
  return createProxy<M>(name, async (mod, method, args) => {
    const result = await bridge.invoke(mod, method, args);
    if (isNativeErrorEnvelope(result)) {
      throw deserializeError(result.__nativeError);
    }
    return result;
  });
}
```

Rewrite `desktop/src/use-native.ts` so it delegates to `getNative` (replace lines 13-57 of the existing file — keep the file's leading doc comment lines 1-11):
```ts
// desktop/src/use-native.ts  (replace body below the leading doc comment)
import { getNative } from './get-native.js';
import type { NativeMethods } from './types.js';

/**
 * Access a native service by name from the renderer.
 *
 * Thin React-facing wrapper over {@link getNative}: it returns the same typed
 * proxy (or `null` outside the Electron shell). The proxy is created on every
 * render but is cheap and stateless, so callers can use it directly.
 *
 * @typeParam M the service's method map (from the `defineNative` author).
 * @param name  the registry key of the native service (e.g. `'fs'`).
 * @returns a typed proxy, or `null` when running outside the Electron shell.
 */
export function useNative<M extends NativeMethods>(name: string): M | null {
  return getNative<M>(name);
}
```

Add `getNative` to `desktop/src/client.ts` (after line 32, alongside `useNative`):
```ts
// desktop/src/client.ts  (renderer hook + proxy block)
export { useNative } from './use-native.js';
export { getNative } from './get-native.js';
export { createProxy } from './bridge/proxy.js';
```

Add `getNative` to the renderer-hook block of `desktop/src/index.ts` (lines 30-32):
```ts
// desktop/src/index.ts
// Renderer hook + proxy.
export { useNative } from './use-native.js';
export { getNative } from './get-native.js';
export { createProxy } from './bridge/proxy.js';
```

- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop && npx vitest run test/get-native.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing test** — `sqlite` service drives better-sqlite3
```ts
// desktop/test/services/sqlite.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Fakes for the better-sqlite3 statement + database the service drives.
const stmtRun = vi.fn();
const stmtAll = vi.fn();
const stmtGet = vi.fn();
const dbPrepare = vi.fn(() => ({ run: stmtRun, all: stmtAll, get: stmtGet }));
const dbExec = vi.fn();
const DatabaseCtor = vi.fn(() => ({ prepare: dbPrepare, exec: dbExec }));

vi.mock('better-sqlite3', () => ({ default: DatabaseCtor }));

// Resolve the DB path off the app userData dir without pulling electron at eval.
const getPath = vi.fn(() => '/tmp/userdata');
vi.mock('electron', () => ({ app: { getPath } }));

import { sqlite } from '../../src/services/sqlite';

beforeEach(() => {
  vi.clearAllMocks();
  stmtAll.mockReturnValue([]);
  stmtGet.mockReturnValue(undefined);
  stmtRun.mockReturnValue({ changes: 0 });
});

describe('sqlite service', () => {
  it('is a native service named "sqlite"', () => {
    expect(sqlite.name).toBe('sqlite');
  });

  it('exec forwards the SQL to better-sqlite3 exec', async () => {
    await sqlite.methods.exec('CREATE TABLE "t" (id TEXT PRIMARY KEY, doc TEXT NOT NULL)');
    expect(dbExec).toHaveBeenCalledWith(
      'CREATE TABLE "t" (id TEXT PRIMARY KEY, doc TEXT NOT NULL)',
    );
  });

  it('run prepares + executes with params and returns { changes }', async () => {
    stmtRun.mockReturnValue({ changes: 1, lastInsertRowid: 0 });
    const res = await sqlite.methods.run('INSERT INTO "t"(id,doc) VALUES(?,?)', ['1', '{}']);
    expect(dbPrepare).toHaveBeenCalledWith('INSERT INTO "t"(id,doc) VALUES(?,?)');
    expect(stmtRun).toHaveBeenCalledWith('1', '{}');
    expect(res).toEqual({ changes: 1 });
  });

  it('all returns the rows from the prepared statement', async () => {
    stmtAll.mockReturnValue([{ doc: '{"a":1}' }, { doc: '{"a":2}' }]);
    const rows = await sqlite.methods.all('SELECT doc FROM "t"', []);
    expect(stmtAll).toHaveBeenCalledWith();
    expect(rows).toEqual([{ doc: '{"a":1}' }, { doc: '{"a":2}' }]);
  });

  it('get returns the first row or undefined', async () => {
    stmtGet.mockReturnValue({ doc: '{"a":1}' });
    await expect(sqlite.methods.get('SELECT doc FROM "t" WHERE id=?', ['1'])).resolves.toEqual({
      doc: '{"a":1}',
    });
    stmtGet.mockReturnValue(undefined);
    await expect(sqlite.methods.get('SELECT doc FROM "t" WHERE id=?', ['9'])).resolves.toBeUndefined();
  });

  it('opens the database lazily (once) under the app userData dir', async () => {
    await sqlite.methods.exec('SELECT 1');
    await sqlite.methods.all('SELECT 1', []);
    expect(DatabaseCtor).toHaveBeenCalledTimes(1);
    expect(getPath).toHaveBeenCalledWith('userData');
  });
});
```
- [ ] **Step 6: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop && npx vitest run test/services/sqlite.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/services/sqlite"` (the service does not exist yet).

- [ ] **Step 7: Create the lazy better-sqlite3 seam + the `sqlite` service + contract type**

Create `desktop/src/services/get-better-sqlite3.ts` (mirrors `get-electron.ts`: keeps the native import out of module-eval time and gives tests one `vi.mock('better-sqlite3', …)` seam):
```ts
// desktop/src/services/get-better-sqlite3.ts
import type DatabaseConstructor from 'better-sqlite3';

/**
 * Lazy, mockable accessor for the optional `better-sqlite3` native module.
 *
 * `better-sqlite3` is a main-process-only native addon and an OPTIONAL peer
 * dependency: importing it at module-eval time would break environments that
 * don't ship it (and would taint any bundle that reaches this file). Going
 * through this single dynamic-import indirection keeps it lazy and gives unit
 * tests one seam to mock via `vi.mock('better-sqlite3', …)`.
 */
export async function getBetterSqlite3(): Promise<typeof DatabaseConstructor> {
  const mod = await import('better-sqlite3');
  return (mod as { default: typeof DatabaseConstructor }).default;
}
```

Create `desktop/src/services/sqlite.ts` (main-only; the `SqliteContract` type is the renderer-safe contract):
```ts
// desktop/src/services/sqlite.ts
import { join } from 'node:path';
import { defineNative } from '../define-native.js';
import { getElectron } from './get-electron.js';
import { getBetterSqlite3 } from './get-better-sqlite3.js';
import type DatabaseInstance from 'better-sqlite3';

/**
 * Built-in `sqlite` native service (main process only).
 *
 * A minimal synchronous-SQLite façade over `better-sqlite3`, exposed through the
 * native bridge so the renderer (and the `@sublime-ui/storage` desktop driver)
 * can drive a real on-disk database over the single `native:invoke` channel
 * without any native module entering the web bundle. The database lives at
 * `<userData>/sublime.db` and is opened lazily, once.
 *
 * `better-sqlite3` is an OPTIONAL peer dependency: an app only needs it when it
 * registers this service. The renderer-facing contract is the type-only
 * {@link SqliteContract}.
 */

let dbPromise: Promise<DatabaseInstance.Database> | undefined;

async function db(): Promise<DatabaseInstance.Database> {
  if (dbPromise === undefined) {
    dbPromise = (async () => {
      const electron = await getElectron();
      const Database = await getBetterSqlite3();
      const file = join(electron.app.getPath('userData'), 'sublime.db');
      return new Database(file);
    })();
  }
  return dbPromise;
}

export const sqlite = defineNative('sqlite', {
  /** Run a parameter-free statement (DDL / PRAGMA). */
  exec: async (sql: string): Promise<void> => {
    (await db()).exec(sql);
  },
  /** Run a write statement with bound params; returns the affected row count. */
  run: async (sql: string, params: unknown[]): Promise<{ changes: number }> => {
    const info = (await db()).prepare(sql).run(...params);
    return { changes: info.changes };
  },
  /** Run a read statement; returns the matching `{ doc }` rows. */
  all: async (sql: string, params: unknown[]): Promise<{ doc: string }[]> => {
    return (await db()).prepare(sql).all(...params) as { doc: string }[];
  },
  /** Run a read statement; returns the first `{ doc }` row or `undefined`. */
  get: async (sql: string, params: unknown[]): Promise<{ doc: string } | undefined> => {
    return (await db()).prepare(sql).get(...params) as { doc: string } | undefined;
  },
});

/**
 * Renderer-safe contract for the `sqlite` native service.
 *
 * `import type { SqliteContract }` only — importing the VALUE `sqlite` would
 * pull `better-sqlite3`/node into the bundle. The `@sublime-ui/storage` desktop
 * driver consumes this type to adapt `getNative<SqliteContract>('sqlite')` to
 * its `SqliteDriver` port.
 */
export type SqliteContract = typeof sqlite.methods;
```

Add the `sqlite` value export to `desktop/src/services/index.ts` (line 9-13 block):
```ts
// desktop/src/services/index.ts
export { fs } from './fs.js';
export { dialog } from './dialog.js';
export { shell } from './shell.js';
export { clipboard } from './clipboard.js';
export { notifications, type NotifyOptions } from './notifications.js';
export { sqlite } from './sqlite.js';
```

Re-export `sqlite` (value) + `SqliteContract` (type) from the main barrel `desktop/src/index.ts` (built-in services block, lines 60-68):
```ts
// desktop/src/index.ts
// Built-in services.
export {
  fs,
  dialog,
  shell,
  clipboard,
  notifications,
  sqlite,
  type NotifyOptions,
} from './services/index.js';

// Renderer-safe contract type for the sqlite service (type-only; safe to import
// from the storage desktop driver without crossing into node/better-sqlite3).
export type { SqliteContract } from './services/sqlite.js';
```

Add `better-sqlite3` as an optional peer dep, expose `./sqlite` (value entry) + `./sqlite-contract` (type-only entry) in `desktop/package.json`, and mark `better-sqlite3` external in the build. Edit the `exports`, `peerDependencies`, and `peerDependenciesMeta` blocks:
```jsonc
// desktop/package.json — exports block
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js"
  },
  "./client": {
    "types": "./dist/client.d.ts",
    "import": "./dist/client.js"
  },
  "./preload": {
    "types": "./dist/bridge/preload.d.ts",
    "import": "./dist/bridge/preload.js"
  },
  "./sqlite": {
    "types": "./dist/services/sqlite.d.ts",
    "import": "./dist/services/sqlite.js"
  },
  "./sqlite-contract": {
    "types": "./dist/services/sqlite.d.ts"
  }
},
```
```jsonc
// desktop/package.json — peerDependencies + meta (better-sqlite3 optional, main-only)
"peerDependencies": {
  "electron": ">=30",
  "react": ">=18",
  "better-sqlite3": ">=11"
},
"peerDependenciesMeta": {
  "electron": {
    "optional": true
  },
  "react": {
    "optional": true
  },
  "better-sqlite3": {
    "optional": true
  }
},
```
And add `better-sqlite3` to the `external` array in `desktop/tsup.config.ts` (so its dynamic import is never inlined into a built chunk):
```ts
// desktop/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**/*.ts', 'src/**/*.tsx'],
  format: ['esm'],
  dts: true,
  clean: true,
  bundle: false,
  external: ['electron', 'react', 'react-dom', 'better-sqlite3'],
});
```

- [ ] **Step 8: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop && npx vitest run test/services/sqlite.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 9: Extend the bundle-safety guard** — assert `get-native` is renderer-safe and `sqlite` is NOT reachable from the client barrel

Append two cases to `desktop/test/client-bundle-safety.test.ts` inside the existing `describe('renderer bundle safety', …)` block (after the `use-native chain` case at line 84):
```ts
// desktop/test/client-bundle-safety.test.ts — append inside the existing describe
  it('the get-native chain pulls in no node:* or electron specifiers', () => {
    const externals = reachableExternals(resolvePath(srcDir, 'get-native.ts'));
    const offenders = externals.filter((s) => FORBIDDEN.test(s));
    expect(offenders).toEqual([]);
  });

  it('the client barrel does not transitively reach the sqlite service or better-sqlite3', () => {
    const externals = reachableExternals(resolvePath(srcDir, 'client.ts'));
    expect(externals).not.toContain('better-sqlite3');
    // The main-only sqlite service file must not be reachable from ./client.
    const seen = new Set<string>();
    const stack = [resolvePath(srcDir, 'client.ts')];
    const sqliteFile = resolvePath(srcDir, 'services/sqlite.ts');
    let reached = false;
    while (stack.length > 0) {
      const file = stack.pop() as string;
      if (seen.has(file)) continue;
      seen.add(file);
      if (file === sqliteFile) reached = true;
      const code = readFileSync(file, 'utf8');
      for (const spec of importSpecifiers(code)) {
        if (spec.startsWith('.')) {
          const local = resolveLocal(file, spec);
          if (local !== null) stack.push(local);
        }
      }
    }
    expect(reached).toBe(false);
  });
```
- [ ] **Step 10: Run the bundle-safety guard, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop && npx vitest run test/client-bundle-safety.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 11: Full desktop suite + typecheck, verify green**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/desktop && npx vitest run && npx tsc --noEmit`
Expected: PASS (all desktop tests green; no type errors).

- [ ] **Step 12: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add desktop/src/get-native.ts desktop/src/use-native.ts desktop/src/client.ts desktop/src/index.ts desktop/src/services/sqlite.ts desktop/src/services/get-better-sqlite3.ts desktop/src/services/index.ts desktop/package.json desktop/tsup.config.ts desktop/test/get-native.test.ts desktop/test/services/sqlite.test.ts desktop/test/client-bundle-safety.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "feat(desktop): hook-free getNative + built-in sqlite native service (better-sqlite3 main-only)"
```

---

### Task I2: desktop SqliteDriver adapter + wire into createDatabaseAdapter.web.ts (@sublime-ui/storage)

**Files:**
- Create: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage/src/desktop.ts` (single owner — H4 does NOT create this file)
- Modify: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage/src/createDatabaseAdapter.web.ts` (add the desktop branch to H4's web-only resolver)
- Modify: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage/src/index.ts` (add `export { createDesktopSqliteAdapter } from './desktop.js'` to the barrel)
- Modify: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage/package.json` (add `./desktop` export + `@sublime-ui/desktop` peer)
- Test: `C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage/test/desktopDriver.test.ts`

**Interfaces:**
- Consumes:
  - `getNative<M>(name)` from `@sublime-ui/desktop/client` (value, renderer-safe) — produced by Task I1.
  - `SqliteContract` from `@sublime-ui/desktop/sqlite-contract` (type-only) — produced by Task I1; methods `exec(sql)`, `run(sql, params)`, `all(sql, params)`, `get(sql, params)`.
  - `SqliteDriver` (the driver port: `exec/run/all/get/tx?`) from the storage SqliteAdapter module — produced by Phase H (`storage/src/sqlite/SqliteDriver.ts`).
  - `SqliteAdapter` (constructed from a `SqliteDriver`) from the storage SqliteAdapter module — produced by Phase H (`storage/src/sqlite/SqliteAdapter.ts`).
  - `DatabaseAdapter` type from `@sublime-ui/framework` — produced by Phase F.
  - `createIndexedDbAdapter()` (the IndexedDB fallback) from `storage/src/web.ts` — produced by Phase H; referenced by the existing `createDatabaseAdapter.web.ts`.
- Produces:
  - `createDesktopSqliteDriver(): SqliteDriver | null` — adapts the `@sublime-ui/desktop` `sqlite` native proxy (reached via `getNative('sqlite')`) to the `SqliteDriver` port; `null` when no native bridge is present.
  - `createDesktopSqliteAdapter(): SqliteAdapter` — `new SqliteAdapter(driver)` over the desktop driver (throws if the bridge is absent — callers gate with bridge detection first). Re-exported from the `@sublime-ui/storage` barrel (this is the export H4 deliberately omitted).

- [ ] **Step 1: Write the failing test** — desktop driver adapts the fake `sublimeNative.sqlite` proxy
```ts
// storage/test/desktopDriver.test.ts
import { afterEach, describe, it, expect, vi } from 'vitest';
import { createDesktopSqliteDriver } from '../src/desktop';

// A fake desktop sqlite native proxy, installed at globalThis.sublimeNative so
// @sublime-ui/desktop's getNative('sqlite') resolves it (getNative reads the
// same bridge useNative does — see desktop/src/get-native.ts).
const exec = vi.fn().mockResolvedValue(undefined);
const run = vi.fn().mockResolvedValue({ changes: 0 });
const all = vi.fn().mockResolvedValue([]);
const get = vi.fn().mockResolvedValue(undefined);

function installBridge(): void {
  (globalThis as unknown as { sublimeNative: { invoke: (m: string, method: string, a: unknown[]) => Promise<unknown> } }).sublimeNative = {
    invoke: (_mod, method, args) => {
      switch (method) {
        case 'exec':
          return exec(args[0]);
        case 'run':
          return run(args[0], args[1]);
        case 'all':
          return all(args[0], args[1]);
        case 'get':
          return get(args[0], args[1]);
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

describe('createDesktopSqliteDriver', () => {
  it('returns null when no native bridge is present', () => {
    expect(createDesktopSqliteDriver()).toBeNull();
  });

  it('exec forwards SQL over the sqlite native proxy', async () => {
    installBridge();
    const driver = createDesktopSqliteDriver();
    expect(driver).not.toBeNull();
    await driver!.exec('CREATE TABLE "t" (id TEXT PRIMARY KEY, doc TEXT NOT NULL)');
    expect(exec).toHaveBeenCalledWith('CREATE TABLE "t" (id TEXT PRIMARY KEY, doc TEXT NOT NULL)');
  });

  it('run forwards SQL + params and returns { changes }', async () => {
    installBridge();
    run.mockResolvedValue({ changes: 1 });
    const driver = createDesktopSqliteDriver();
    const res = await driver!.run('INSERT INTO "t"(id,doc) VALUES(?,?)', ['1', '{}']);
    expect(run).toHaveBeenCalledWith('INSERT INTO "t"(id,doc) VALUES(?,?)', ['1', '{}']);
    expect(res).toEqual({ changes: 1 });
  });

  it('all returns the { doc } rows from the proxy', async () => {
    installBridge();
    all.mockResolvedValue([{ doc: '{"a":1}' }, { doc: '{"a":2}' }]);
    const driver = createDesktopSqliteDriver();
    await expect(driver!.all('SELECT doc FROM "t"', [])).resolves.toEqual([
      { doc: '{"a":1}' },
      { doc: '{"a":2}' },
    ]);
    expect(all).toHaveBeenCalledWith('SELECT doc FROM "t"', []);
  });

  it('get returns the first { doc } row or undefined', async () => {
    installBridge();
    get.mockResolvedValue({ doc: '{"a":1}' });
    const driver = createDesktopSqliteDriver();
    await expect(driver!.get('SELECT doc FROM "t" WHERE id=?', ['1'])).resolves.toEqual({
      doc: '{"a":1}',
    });
    get.mockResolvedValue(undefined);
    await expect(driver!.get('SELECT doc FROM "t" WHERE id=?', ['9'])).resolves.toBeUndefined();
  });

  it('does not expose a tx (desktop defers multi-statement transactions in SP1)', () => {
    installBridge();
    const driver = createDesktopSqliteDriver();
    expect(driver!.tx).toBeUndefined();
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage && npx vitest run test/desktopDriver.test.ts`
Expected: FAIL — `Failed to resolve import "../src/desktop"` (the module does not exist yet).

- [ ] **Step 3: Create `storage/src/desktop.ts`**
```ts
// storage/src/desktop.ts
/**
 * Desktop SQLite plumbing for `@sublime-ui/storage`.
 *
 * On desktop the web bundle runs inside the Electron renderer, where the
 * `@sublime-ui/desktop` native bridge exposes a built-in `sqlite` service backed
 * by `better-sqlite3` in the MAIN process. This module adapts that service's
 * renderer-safe proxy (reached hook-free via `getNative('sqlite')`) to the
 * platform-agnostic {@link SqliteDriver} port, which feeds the shared
 * {@link SqliteAdapter}. No native module is imported here — only the type-only
 * {@link SqliteContract} — so this file is safe in the web/renderer graph.
 *
 * Transactions are intentionally NOT implemented in SP1 (the driver omits `tx`),
 * so `DbGateway` falls back to sequential awaits; a future `sqlite.batch()` over
 * one IPC adds it.
 */

import { getNative } from '@sublime-ui/desktop/client';
import { SqliteAdapter } from './sqlite/SqliteAdapter.js';
import type { SqliteDriver } from './sqlite/SqliteDriver.js';
import type { SqliteContract } from '@sublime-ui/desktop/sqlite-contract';

/**
 * Build a {@link SqliteDriver} backed by the desktop `sqlite` native proxy.
 *
 * @returns the driver, or `null` when no native bridge is present (plain web).
 */
export function createDesktopSqliteDriver(): SqliteDriver | null {
  const native = getNative<SqliteContract>('sqlite');
  if (native === null) {
    return null;
  }
  return {
    exec: (sql) => native.exec(sql),
    run: (sql, params) => native.run(sql, params),
    all: (sql, params) => native.all(sql, params),
    get: (sql, params) => native.get(sql, params),
    // `tx` deliberately omitted: desktop defers multi-statement transactions (SP1).
  };
}

/**
 * Build a {@link SqliteAdapter} over the desktop SQLite driver.
 *
 * @throws if no native bridge is present — callers must detect the bridge first
 * (see `createDatabaseAdapter.web.ts`); this is the SQLite-over-IPC branch.
 */
export function createDesktopSqliteAdapter(): SqliteAdapter {
  const driver = createDesktopSqliteDriver();
  if (driver === null) {
    throw new Error(
      'createDesktopSqliteAdapter: no @sublime-ui/desktop native bridge detected; ' +
        'use createDatabaseAdapter() which falls back to IndexedDB on plain web.',
    );
  }
  return new SqliteAdapter(driver);
}
```
- [ ] **Step 3b: Add `createDesktopSqliteAdapter` to the storage barrel** so the `./desktop.js` value surface is reachable from `@sublime-ui/storage` (it was intentionally omitted in H4 because this file did not exist yet). Add this line to `storage/src/index.ts`:
```ts
export { createDesktopSqliteAdapter } from './desktop.js';
```
- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage && npx vitest run test/desktopDriver.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Extend H4's failing test** — `createDatabaseAdapter()` (web entry) auto-upgrades to SQLite when the bridge is present. Add the bridge-present case to H4's `storage/test/createDatabaseAdapter.test.ts` (H4 already asserts the no-bridge → IndexedDb case). The bridge fixture is the REAL shape `getNative` reads: `globalThis.sublimeNative = { invoke }` (NOT `{ sqlite: {...} }`). Append:
```ts
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
```
- [ ] **Step 6: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage && npx vitest run test/createDatabaseAdapter.test.ts`
Expected: FAIL — `createDatabaseAdapter` returns an IndexedDB adapter even with the bridge installed (the bridge-detected branch is not yet wired to the desktop driver), so `toBeInstanceOf(SqliteAdapter)` fails.

- [ ] **Step 7: Add the desktop branch to H4's web-only `createDatabaseAdapter.web.ts`**

Update `storage/src/createDatabaseAdapter.web.ts` (web-only from H4) so it detects the desktop native bridge via `getNative('sqlite')` (which works over `globalThis.sublimeNative.invoke` — the one real IPC channel, surfaced through `createDesktopSqliteDriver()`); if a sqlite native proxy is available, return `createDesktopSqliteAdapter()`, else fall back to IndexedDB. The complete file:
```ts
// storage/src/createDatabaseAdapter.web.ts
/**
 * Web/renderer resolver for the platform DatabaseAdapter.
 *
 * The web bundler picks this `.web.ts` entry. At RUNTIME it probes for the
 * desktop native bridge via `getNative('sqlite')` (from `@sublime-ui/desktop/client`,
 * which forwards over `globalThis.sublimeNative.invoke` — the single real IPC
 * channel): on desktop (where the web bundle runs inside Electron) it returns the
 * SQLite-over-IPC adapter; on plain web it returns the IndexedDB adapter. No
 * native module is imported — the desktop path goes through
 * `@sublime-ui/desktop/client` (renderer-safe) and a type-only `SqliteContract`.
 */

import { createIndexedDbAdapter } from './web.js';
import { createDesktopSqliteDriver, createDesktopSqliteAdapter } from './desktop.js';
import type { DatabaseAdapter } from '@sublime-ui/framework';

/** Resolve the DatabaseAdapter for the web bundle (desktop-aware). */
export function createDatabaseAdapter(): DatabaseAdapter {
  // Probe the desktop native bridge: createDesktopSqliteDriver() returns null on
  // plain web (no globalThis.sublimeNative) and a driver inside Electron.
  if (createDesktopSqliteDriver() !== null) {
    // Desktop: the web bundle is running inside Electron with the native bridge.
    return createDesktopSqliteAdapter();
  }
  // Plain web: no native bridge — use IndexedDB.
  return createIndexedDbAdapter();
}
```
> Note on existing code: H4's `createDatabaseAdapter.web.ts` is web-only (`return new IndexedDbAdapter()` / `createIndexedDbAdapter()`). This task ADDS the desktop branch, gated by `createDesktopSqliteDriver()` (which itself uses `getNative('sqlite')`), and keeps the IndexedDB fallback. The bridge fixture in tests is `globalThis.sublimeNative = { invoke }` — the real shape `getNative` reads — never `{ sqlite: {...} }`.

- [ ] **Step 8: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage && npx vitest run test/createDatabaseAdapter.test.ts`
Expected: PASS (both the H4 no-bridge → IndexedDb case and the I2 bridge-present → SqliteAdapter case).

- [ ] **Step 9: Add the `./desktop` export + `@sublime-ui/desktop` peer to `storage/package.json`**

Add `./desktop` to the `exports` map (per §7.5) and declare `@sublime-ui/desktop` as a peer dependency (the desktop driver imports `@sublime-ui/desktop/client`):
```jsonc
// storage/package.json — exports block (add ./desktop)
"exports": {
  ".":        "./dist/index.js",
  "./web":    "./dist/web.js",
  "./desktop": "./dist/desktop.js",
  "./mobile": "./dist/mobile.js"
},
```
```jsonc
// storage/package.json — add to peerDependencies + peerDependenciesMeta
"peerDependencies": {
  "@sublime-ui/framework": "workspace:*",
  "@sublime-ui/desktop": "workspace:*"
},
"peerDependenciesMeta": {
  "@sublime-ui/desktop": {
    "optional": true
  }
},
```
> Note: keep any existing peers (`idb`, `expo-sqlite`, `better-sqlite3`) added by Phase H; this task only ADDS `@sublime-ui/desktop` and the `./desktop` export. The `@sublime-ui/desktop` `./client` and `./sqlite-contract` subpath entries are produced by Task I1.

- [ ] **Step 10: Storage suite + typecheck, verify green**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/storage && npx vitest run && npx tsc --noEmit`
Expected: PASS (all storage tests green; no type errors; the desktop driver file imports only `@sublime-ui/desktop/client` + type-only `SqliteContract`, so no native module enters the web/renderer graph).

- [ ] **Step 11: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add storage/src/desktop.ts storage/src/createDatabaseAdapter.web.ts storage/src/index.ts storage/package.json storage/test/desktopDriver.test.ts storage/test/createDatabaseAdapter.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "feat(storage): desktop SqliteDriver over native bridge + wire into web adapter resolver"
```
