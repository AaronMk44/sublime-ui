import { DataError } from './DataError.js';

export interface NetworkErrorOptions {
  url?: string;
  cause?: unknown;
}

/** Connection-level failure: DNS error, offline, connection refused, fetch reject. */
export class NetworkError extends DataError {
  readonly url?: string;

  constructor(message: string, opts: NetworkErrorOptions = {}) {
    super(message, { code: 'network', cause: opts.cause });
    if (opts.url !== undefined) this.url = opts.url;
  }
}
