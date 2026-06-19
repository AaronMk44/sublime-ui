import type { NativeMethods } from '../types';

/**
 * Build the renderer-side typed proxy for a native service.
 *
 * Every property access on the returned object yields a function that forwards
 * its call to `invoke(mod, method, args)` — the single `native:invoke` IPC
 * channel. No node dependencies enter the renderer: the proxy only knows the
 * module name and forwards arguments, while the `M` type parameter (derived
 * from the service authored with `defineNative`) gives end-to-end type safety.
 *
 * @param mod    the native service name (the registry key).
 * @param invoke the transport: forwards `(mod, method, args)` over IPC.
 *
 * @example
 * const printer = createProxy<{ print: (copies: number) => Promise<string> }>(
 *   'printer',
 *   invoke,
 * );
 * await printer.print(7); // invoke('printer', 'print', [7])
 */
export function createProxy<M extends NativeMethods>(
  mod: string,
  invoke: (mod: string, method: string, args: unknown[]) => Promise<unknown>,
): M {
  return new Proxy({} as M, {
    get(_target, prop) {
      return (...args: unknown[]) => invoke(mod, String(prop), args);
    },
  });
}
