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
registerModel(Widget as unknown as { name: string; resource?: string });

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
