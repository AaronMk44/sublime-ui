import { describe, it, expect, vi, afterEach } from 'vitest';
import { createModelSlice } from '../src/store/createModelSlice.js';
import { store, registerReducer } from '../src/store/store.js';
import { NetworkError } from '../src/errors/NetworkError.js';

describe('store serializableCheck ignores DataError in slice.error', () => {
  afterEach(() => vi.restoreAllMocks());

  it('does not warn when a NetworkError is dispatched into slice.error', () => {
    const slice = createModelSlice('serialtest', { idKey: 'id' });
    registerReducer(slice.name, slice.reducer);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    store.dispatch(
      slice.actions.setError(new NetworkError('offline', { url: '/x' })),
    );
    const calls = spy.mock.calls.map((c) => String(c[0]));
    expect(calls.some((m) => m.includes('non-serializable'))).toBe(false);
  });
});
