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
registerModel(User as unknown as { name: string; resource?: string });

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
