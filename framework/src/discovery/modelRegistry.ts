import type { Gateway } from '../gateway/Gateway.js';
import type { ModelSlice } from '../store/createModelSlice.js';

export interface ModelRegistration {
  gateway: Gateway;
  sliceName: string;
  actions: ModelSlice['actions'];
  idKey: string;
}

/** A class constructor used as a registry key (carries a `.name`). */
type ModelCtor = abstract new (...args: never[]) => object;

const registrations = new Map<ModelCtor, ModelRegistration>();

export const modelRegistry = {
  register(ctor: ModelCtor, reg: ModelRegistration): void {
    registrations.set(ctor, reg);
  },
  resolve(ctor: ModelCtor): ModelRegistration {
    const reg = registrations.get(ctor);
    if (!reg) {
      throw new Error(
        `Model "${ctor.name}" is not registered. Call registerModel(${ctor.name}) after defining it.`,
      );
    }
    return reg;
  },
};
