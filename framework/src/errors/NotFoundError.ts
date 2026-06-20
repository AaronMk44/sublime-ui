import { DataError } from './DataError.js';

export interface NotFoundErrorOptions {
  resource?: string;
  id?: string | number;
  cause?: unknown;
}

/**
 * Thrown by update-of-missing across all three strategies. NOT thrown by
 * find/show — genuine read absence resolves to null.
 */
export class NotFoundError extends DataError {
  readonly resource?: string;
  readonly id?: string | number;

  constructor(message: string, opts: NotFoundErrorOptions = {}) {
    super(message, { code: 'not_found', cause: opts.cause });
    if (opts.resource !== undefined) this.resource = opts.resource;
    if (opts.id !== undefined) this.id = opts.id;
  }
}
