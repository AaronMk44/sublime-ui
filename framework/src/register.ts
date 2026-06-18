import { Gateway } from './gateway/Gateway.js';
import { createModelSlice } from './store/createModelSlice.js';
import { registerReducer } from './store/store.js';
import { modelRegistry } from './discovery/modelRegistry.js';

export function registerModel(
  ModelClass: { name: string; resource?: string },
  opts: { name?: string; idKey?: string } = {},
): void {
  const resource = ModelClass.resource;
  if (!resource) {
    throw new Error(
      `Model "${ModelClass.name}" is missing a static "resource" (e.g. protected static resource = '/users').`,
    );
  }
  const sliceName = opts.name ?? `${ModelClass.name.toLowerCase()}s`;
  const idKey = opts.idKey ?? 'id';

  const gateway = new Gateway(resource);
  const slice = createModelSlice(sliceName, { idKey });
  registerReducer(slice.name, slice.reducer);
  modelRegistry.register(ModelClass as unknown as abstract new (...args: never[]) => object, {
    gateway,
    sliceName,
    actions: slice.actions,
    idKey,
  });
}
