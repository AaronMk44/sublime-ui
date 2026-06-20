import { DataError, type DataErrorCode } from '../errors/DataError.js';

export interface HttpErrorOptions {
  status: number;
  errors: unknown;
  url: string;
  cause?: unknown;
}

/**
 * "Came over the wire" error: a non-2xx HTTP response (or a malformed one).
 * Extends DataError with HTTP transport details. code defaults to 'http'.
 * Was the framework's former `ApiError` (now a back-compat alias).
 */
export class HttpError extends DataError {
  readonly status: number;
  readonly errors: unknown;
  readonly url: string;

  constructor(message: string, opts: HttpErrorOptions) {
    const code: DataErrorCode = 'http';
    super(message, { code, cause: opts.cause });
    this.status = opts.status;
    this.errors = opts.errors;
    this.url = opts.url;
  }
}
