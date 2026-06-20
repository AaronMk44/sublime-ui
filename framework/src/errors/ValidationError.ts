import { DataError } from './DataError.js';

export interface ValidationErrorOptions {
  fields?: unknown;
  cause?: unknown;
}

/** RESERVED for SP3 (per-field server validation). Thrown nowhere in SP1. */
export class ValidationError extends DataError {
  readonly fields?: unknown;

  constructor(message: string, opts: ValidationErrorOptions = {}) {
    super(message, { code: 'validation', cause: opts.cause });
    if (opts.fields !== undefined) this.fields = opts.fields;
  }
}
