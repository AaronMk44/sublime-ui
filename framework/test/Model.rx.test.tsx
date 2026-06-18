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
registerModel(Gadget as unknown as { name: string; resource?: string });

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
