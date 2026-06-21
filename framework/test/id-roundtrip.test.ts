import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Model, registerModel, HttpGateway, configureSublime, store } from '../src/index.js';
import { resetConfig } from '../src/config/Config.js';

// UUID-keyed, in-memory (default gateway).
class Doc extends Model {
  protected static override resource = 'docs';
  declare id: string;
  declare title: string;
}
// Numeric-keyed, HTTP-backed.
class Account extends Model {
  protected static override resource = '/accounts';
  declare id: number;
  declare email: string;
}
registerModel(Doc as unknown as { name: string; resource?: string });
registerModel(Account as unknown as { name: string; resource?: string }, HttpGateway);

describe('id round-trip — ids survive find/save/delete across backends (spec #15)', () => {
  beforeEach(() => {
    resetConfig();
    configureSublime({ baseURL: 'https://api.example.com', platform: 'web' });
    store.dispatch({ type: 'docs/reset' });
    store.dispatch({ type: 'accounts/reset' });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('UUID-keyed in-memory model preserves a string id through save/find/delete', async () => {
    const uuid = '7f3b2c1a-0d4e-4a6b-9c8d-1e2f3a4b5c6d';
    // Seed the slice so save() exercises the update path with a developer-supplied
    // string id (Model.save() routes to create only when id is null/undefined).
    store.dispatch({ type: 'docs/upsertItem', payload: { id: uuid, title: 'seed' } });

    const created = await new Doc({ id: uuid, title: 'spec' }).save();
    expect(created.id).toBe(uuid); // string id not coerced

    const found = await Doc.find(uuid);
    expect(found?.id).toBe(uuid);

    await created.delete();
    expect(await Doc.find(uuid)).toBeNull();
  });

  it('numeric-keyed HTTP model preserves a number id through save/find/delete', async () => {
    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method === 'POST') {
        return { ok: true, status: 201, json: async () => ({ success: true, message: '', data: { id: 42, email: 'a@b.c' }, errors: null }) } as Response;
      }
      if (method === 'DELETE') {
        return { ok: true, status: 204, json: async () => ({ success: true, message: '', data: null, errors: null }) } as Response;
      }
      // GET /accounts/42
      return { ok: true, status: 200, json: async () => ({ success: true, message: '', data: { id: 42, email: 'a@b.c' }, errors: null }) } as Response;
    });

    const saved = await new Account({ email: 'a@b.c' }).save();
    expect(saved.id).toBe(42);
    expect(typeof saved.id).toBe('number'); // numeric id not stringified

    const found = await Account.find(42);
    expect(found?.id).toBe(42);

    await saved.delete();
  });
});
