import { describe, it, expect } from 'vitest';
import { configureStore, createSlice } from '@reduxjs/toolkit';

describe('framework test environment', () => {
  it('has a DOM (jsdom)', () => {
    expect(typeof document).toBe('object');
    expect(document.createElement('div').tagName).toBe('DIV');
  });

  it('can build a Redux Toolkit store', () => {
    const slice = createSlice({
      name: 'ping',
      initialState: { n: 0 },
      reducers: { inc: (s) => { s.n += 1; } },
    });
    const store = configureStore({ reducer: { ping: slice.reducer } });
    store.dispatch(slice.actions.inc());
    expect(store.getState().ping.n).toBe(1);
  });
});
