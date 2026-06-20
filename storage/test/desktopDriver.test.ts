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
