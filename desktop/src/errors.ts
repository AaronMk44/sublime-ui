/**
 * Typed error transport for the native bridge.
 *
 * Errors thrown by a native service in the main process are serialized to a
 * plain {@link SerializedError} so they can cross the `native:invoke` IPC
 * boundary, then revived into a {@link NativeError} on the renderer side.
 */

/** Plain, structured-clone-safe representation of a native error. */
export interface SerializedError {
  name: string;
  message: string;
  code?: string;
}

/** Error type rethrown on the renderer when a native call fails. */
export class NativeError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'NativeError';
    if (code !== undefined) {
      this.code = code;
    }
  }
}

/** Coerce any throwable into a transport-safe {@link SerializedError}. */
export function serializeError(e: unknown): SerializedError {
  if (e instanceof Error) {
    const code = (e as { code?: unknown }).code;
    const out: SerializedError = { name: e.name, message: e.message };
    if (typeof code === 'string') {
      out.code = code;
    }
    return out;
  }
  return { name: 'Error', message: String(e) };
}

/** Revive a {@link SerializedError} into a {@link NativeError}. */
export function deserializeError(s: SerializedError): NativeError {
  return new NativeError(s.message, s.code);
}
