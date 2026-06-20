import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Model, registerModel, HttpGateway, configureSublime, store } from '../src/index.js';
import { resetConfig } from '../src/config/Config.js';
import { mockFetch } from '../src/test-utils/mockFetch.js';

// User is server-backed (REST). Note is in-memory (the new default).
class User extends Model {
  protected static override resource = '/users';
  declare id: number;
  declare name: string;
}
class Note extends Model {
  protected static override resource = 'notes';
  declare id: string;
  declare title: string;
}
registerModel(User as unknown as { name: string; resource?: string }, HttpGateway);
registerModel(Note as unknown as { name: string; resource?: string }); // in-memory default

describe('mixed-backend app — HTTP + in-memory in one store', () => {
  beforeEach(() => {
    resetConfig();
    // NOTE: no databaseAdapter, and baseURL present only for the HTTP model.
    configureSublime({ baseURL: 'https://api.example.com', platform: 'web' });
    store.dispatch({ type: 'users/reset' });
    store.dispatch({ type: 'notes/reset' });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('Note CRUD works with no databaseAdapter and no per-model baseURL', async () => {
    const created = await new Note({ title: 'first' }).save(); // create (no id) -> genId
    expect(typeof created.id).toBe('string');
    expect(created.title).toBe('first');

    const all = await Note.all();
    expect(all.map((n) => n.title)).toEqual(['first']);

    const found = await Note.find(created.id);
    expect(found?.title).toBe('first');

    const missing = await Note.find('does-not-exist');
    expect(missing).toBeNull(); // absence -> null, no throw

    await created.delete();
    expect((await Note.all()).length).toBe(0);
  });

  it('User.all() hits fetch (HTTP-backed model) and never touches the DB adapter', async () => {
    const seen: string[] = [];
    mockFetch(({ url, method }) => {
      seen.push(`${method} ${url}`);
      return { json: { success: true, message: '', data: [{ id: 1, name: 'ada' }], errors: null } };
    });

    const users = await User.all();
    expect(users.map((u) => u.name)).toEqual(['ada']);
    expect(seen).toEqual(['GET https://api.example.com/users']);
  });

  it('absence of a databaseAdapter does not break HTTP or in-memory models', async () => {
    mockFetch(() => ({ json: { success: true, message: '', data: [{ id: 7, name: 'grace' }], errors: null } }));
    const [users] = await Promise.all([User.all(), Note.all()]);
    expect(users.first()?.name).toBe('grace');
    // No ConfigError for the missing databaseAdapter — neither model uses DbGateway.
    await expect(new Note({ title: 'x' }).save()).resolves.toBeInstanceOf(Note);
  });
});
