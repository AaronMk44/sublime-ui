/**
 * Builds a model instance from a plain object. Data lands as own enumerable
 * properties; getters/methods come from the prototype. No constructor runs,
 * so hydration never depends on constructor side effects.
 */
export function hydrate<T extends object>(
  ModelClass: new () => T,
  plain: Record<string, unknown>,
): T {
  const instance = Object.create(ModelClass.prototype) as T;
  Object.assign(instance, plain);
  return instance;
}

/**
 * Extracts the instance's own enumerable data — exactly what belongs in the
 * store. Prototype getters/methods are excluded, so no class instance or
 * computed value is ever persisted.
 */
export function toPlain(instance: object): Record<string, unknown> {
  return { ...instance };
}
