import { describe, it, expect, vi, afterEach } from 'vitest';
import { createModelSlice } from '../src/store/createModelSlice.js';
import { store, registerReducer } from '../src/store/store.js';
import { ApiError } from '../src/gateway/ApiError.js';

describe('store serializableCheck ignores ApiError in slice.error', () => {
  afterEach(() => vi.restoreAllMocks());

  it('does not warn when an ApiError is dispatched into slice.error', () => {
    const slice = createModelSlice('serialtest', { idKey: 'id' });
    registerReducer(slice.name, slice.reducer);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    store.dispatch(
      slice.actions.setError(new ApiError('boom', { status: 500, errors: null, url: '/x' })),
    );
    const calls = spy.mock.calls.map((c) => String(c[0]));
    expect(calls.some((m) => m.includes('non-serializable'))).toBe(false);
  });
});
