import { describe, it, expect } from 'vitest';
import { modelRegistry } from '../src/discovery/modelRegistry.js';
import { Gateway } from '../src/gateway/Gateway.js';
import { createModelSlice } from '../src/store/createModelSlice.js';

class Thing {}

describe('modelRegistry', () => {
  it('registers and resolves a model registration', () => {
    const slice = createModelSlice('things', { idKey: 'id' });
    const reg = { gateway: new Gateway('/things'), sliceName: 'things', actions: slice.actions, idKey: 'id' };
    modelRegistry.register(Thing, reg);
    expect(modelRegistry.resolve(Thing)).toBe(reg);
  });

  it('throws for an unregistered model', () => {
    class Unknown {}
    expect(() => modelRegistry.resolve(Unknown)).toThrow(/not registered/i);
  });
});
