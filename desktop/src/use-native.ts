/**
 * Renderer hook for consuming a native service from React.
 *
 * `useNative('fs')` reads the `window.sublimeNative` bridge exposed by the
 * preload (see `exposeNativeBridge`). On plain web — where no preload ran and
 * the bridge is absent — it returns `null`, letting components gracefully
 * degrade. Inside the Electron shell it returns a typed {@link createProxy}
 * whose `invoke` forwards over the one `native:invoke` channel and revives any
 * `{ __nativeError }` envelope (produced by the main router) back into a
 * {@link NativeError} so the caller sees a normal rejected promise.
 */

import { createProxy } from './bridge/proxy';
import { deserializeError } from './errors';
import type { SerializedError } from './errors';
import type { NativeMethods } from './types';

/** Shape of the bridge exposed at `window.sublimeNative` by the preload. */
interface SublimeNativeWindow {
  invoke(mod: string, method: string, args: unknown[]): Promise<unknown>;
}

/** Envelope shape returned by the main router when a native call fails. */
interface NativeErrorEnvelope {
  __nativeError: SerializedError;
}

function isNativeErrorEnvelope(value: unknown): value is NativeErrorEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__nativeError' in value
  );
}

/**
 * Access a native service by name from the renderer.
 *
 * @typeParam M the service's method map (from the `defineNative` author).
 * @param name  the registry key of the native service (e.g. `'fs'`).
 * @returns a typed proxy, or `null` when running outside the Electron shell.
 */
export function useNative<M extends NativeMethods>(name: string): M | null {
  const bridge = (
    globalThis as { sublimeNative?: SublimeNativeWindow }
  ).sublimeNative;
  if (bridge === undefined) {
    return null;
  }
  return createProxy<M>(name, async (mod, method, args) => {
    const result = await bridge.invoke(mod, method, args);
    if (isNativeErrorEnvelope(result)) {
      throw deserializeError(result.__nativeError);
    }
    return result;
  });
}
