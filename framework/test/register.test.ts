import { describe, it, expect } from 'vitest';
import { registerModel } from '../src/register.js';
import { modelRegistry } from '../src/discovery/modelRegistry.js';
import { store } from '../src/store/store.js';

class Invoice {
  static resource = '/invoices';
}

describe('registerModel', () => {
  it('wires gateway + slice + reducer + discovery', () => {
    registerModel(Invoice as unknown as { name: string; resource?: string });
    const reg = modelRegistry.resolve(Invoice);
    expect(reg.sliceName).toBe('invoices');
    expect(reg.idKey).toBe('id');
    // reducer is registered → store has the slice after a dispatch
    store.dispatch(reg.actions.setItems([{ id: 1 }]));
    const state = store.getState() as Record<string, { items: unknown[] }>;
    expect(state['invoices']!.items).toEqual([{ id: 1 }]);
  });

  it('throws when resource is missing', () => {
    class NoResource {}
    expect(() =>
      registerModel(NoResource as unknown as { name: string; resource?: string }),
    ).toThrow(/resource/i);
  });
});
