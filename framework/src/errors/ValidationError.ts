import { DataError } from './DataError.js';

export interface ValidationErrorOptions {
  fields?: unknown;
  cause?: unknown;
}

/** Thrown on HTTP 422 (per-field server validation); `fields` carries the server's per-field errors. */
export class ValidationError extends DataError {
  readonly fields?: unknown;

  constructor(message: string, opts: ValidationErrorOptions = {}) {
    super(message, { code: 'validation', cause: opts.cause });
    if (opts.fields !== undefined) this.fields = opts.fields;
  }
}
