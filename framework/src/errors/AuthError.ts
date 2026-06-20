import { DataError } from './DataError.js';

export interface AuthErrorOptions {
  status?: number;
  cause?: unknown;
}

/** Authentication / authorization failure: HTTP 401 / 403. */
export class AuthError extends DataError {
  readonly status?: number;

  constructor(message: string, opts: AuthErrorOptions = {}) {
    super(message, { code: 'auth', cause: opts.cause });
    if (opts.status !== undefined) this.status = opts.status;
  }
}
