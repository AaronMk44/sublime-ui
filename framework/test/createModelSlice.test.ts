import { describe, it, expect } from 'vitest';
import { createModelSlice } from '../src/store/createModelSlice.js';

function make() {
  const slice = createModelSlice('users', { idKey: 'id' });
  let state = slice.reducer(undefined, { type: '@@init' });
  const apply = (action: { type: string; payload?: unknown }) => {
    state = slice.reducer(state, action);
    return state;
  };
  return { slice, get: () => state, apply };
}

describe('createModelSlice', () => {
  it('starts idle and empty', () => {
    const { get } = make();
    expect(get()).toEqual({ items: [], activeId: null, status: 'idle', error: null });
  });

  it('setItems replaces the collection and marks success', () => {
    const { slice, apply, get } = make();
    apply(slice.actions.setItems([{ id: 1 }, { id: 2 }]));
    expect(get().items).toEqual([{ id: 1 }, { id: 2 }]);
    expect(get().status).toBe('success');
  });

  it('upsertItem inserts or replaces by idKey', () => {
    const { slice, apply, get } = make();
    apply(slice.actions.setItems([{ id: 1, n: 'a' }]));
    apply(slice.actions.upsertItem({ id: 1, n: 'b' })); // replace
    apply(slice.actions.upsertItem({ id: 2, n: 'c' })); // insert
    expect(get().items).toEqual([{ id: 1, n: 'b' }, { id: 2, n: 'c' }]);
  });

  it('removeItem deletes by id', () => {
    const { slice, apply, get } = make();
    apply(slice.actions.setItems([{ id: 1 }, { id: 2 }]));
    apply(slice.actions.removeItem(1));
    expect(get().items).toEqual([{ id: 2 }]);
  });

  it('setStatus and setError track async state', () => {
    const { slice, apply, get } = make();
    apply(slice.actions.setStatus('loading'));
    expect(get().status).toBe('loading');
    apply(slice.actions.setError({ name: 'HttpError', message: 'x', code: 'http', status: 500, errors: null, url: '/u' } as never));
    expect(get().status).toBe('error');
    expect(get().error).toMatchObject({ code: 'http' });
  });
});
