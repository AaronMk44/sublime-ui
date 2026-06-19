/**
 * Native service registry.
 *
 * Services authored in the main process are registered here; the
 * `native:invoke` router resolves `(module, method)` pairs against this
 * registry and dispatches. Anything not registered resolves to `undefined`,
 * which the router treats as an unknown-method rejection.
 */

import type { NativeMethods, NativeService } from './types';

const services = new Map<string, NativeService>();

/** Register one or more native services, keyed by their `name`. */
export function registerNative(toRegister: NativeService[]): void {
  for (const service of toRegister) {
    services.set(service.name, service);
  }
}

/**
 * Resolve a `(module, method)` pair to its implementation, or `undefined`
 * when the module is unknown or the method is not exposed by it.
 */
export function resolve(
  mod: string,
  method: string,
): ((...args: any[]) => Promise<any>) | undefined {
  const methods: NativeMethods | undefined = services.get(mod)?.methods;
  if (methods === undefined) {
    return undefined;
  }
  // OWN-property lookup only: a renderer must never reach inherited members
  // (`constructor`, `__proto__`, `toString`, `hasOwnProperty`, `valueOf`, …)
  // through the prototype chain, which `methods[method]` would expose.
  return Object.prototype.hasOwnProperty.call(methods, method)
    ? methods[method]
    : undefined;
}

/** Clear all registered services. Test seam. */
export function clearRegistry(): void {
  services.clear();
}
