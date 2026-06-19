/**
 * Main-process IPC router for the single `native:invoke` channel.
 *
 * Registers one handler that resolves `(module, method)` against the native
 * registry and dispatches. Unknown pairs throw a {@link NativeError}; any
 * throw (unknown or from the impl) is caught and returned as a
 * `{ __nativeError: SerializedError }` envelope, which the renderer proxy
 * (`useNative` / Task 8) revives into a {@link NativeError} and rethrows.
 * Keeping the error convention as a returned envelope — rather than a rejected
 * promise — gives the proxy a single, structured-clone-safe shape to detect.
 */

import { resolve } from '../registry';
import { NativeError, serializeError, type SerializedError } from '../errors';

/** Envelope returned over IPC when a native call fails. */
export interface NativeErrorEnvelope {
  __nativeError: SerializedError;
}

/** Minimal `ipcMain` surface needed to register the channel. Injectable. */
export interface IpcMainLike {
  handle(channel: string, listener: (e: unknown, ...args: any[]) => any): void;
}

/**
 * Install the `native:invoke` router onto the given `ipcMain`.
 *
 * @param ipcMain Electron's `ipcMain` (or a compatible fake for tests).
 */
export function installNativeRouter(ipcMain: IpcMainLike): void {
  ipcMain.handle(
    'native:invoke',
    async (
      _event: unknown,
      mod: string,
      method: string,
      args: unknown[] = [],
    ): Promise<unknown> => {
      try {
        const fn = resolve(mod, method);
        if (fn === undefined) {
          throw new NativeError(`Unknown native method ${mod}:${method}`);
        }
        return await fn(...args);
      } catch (e) {
        const envelope: NativeErrorEnvelope = { __nativeError: serializeError(e) };
        return envelope;
      }
    },
  );
}
