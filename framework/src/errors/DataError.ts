export type DataErrorCode =
  | 'http'
  | 'network'
  | 'auth'
  | 'validation'
  | 'not_found'
  | 'config'
  | 'storage'
  | 'unsupported'
  | 'unknown';

export interface DataErrorOptions {
  code?: DataErrorCode;
  cause?: unknown;
}

/**
 * Transport-neutral base error. Every real framework data-layer failure is a
 * DataError (or a subclass); absence is never a failure (find/show return null).
 *
 * Uses `new.target.prototype` so subclass `instanceof` works under transpiled
 * `extends Error` targets — fixes the latent bug where a fixed
 * `Object.setPrototypeOf(this, DataError.prototype)` would break subclass checks.
 */
export class DataError extends Error {
  readonly code: DataErrorCode;
  override readonly cause?: unknown;

  constructor(message: string, opts: DataErrorOptions = {}) {
    super(message);
    this.name = new.target.name;
    this.code = opts.code ?? 'unknown';
    if (opts.cause !== undefined) this.cause = opts.cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
