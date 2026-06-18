import { describe, it, expect } from 'vitest';
import { createModelSlice } from '../src/store/createModelSlice.js';
import { store, registerReducer } from '../src/store/store.js';

describe('dynamic store', () => {
  it('injects a reducer after store creation and dispatches into it', () => {
    const slice = createModelSlice('widgets', { idKey: 'id' });
    registerReducer(slice.name, slice.reducer);

    store.dispatch(slice.actions.setItems([{ id: 1 }, { id: 2 }]));
    const state = store.getState() as Record<string, { items: unknown[] }>;
    expect(state['widgets']!.items).toEqual([{ id: 1 }, { id: 2 }]);
  });
});
