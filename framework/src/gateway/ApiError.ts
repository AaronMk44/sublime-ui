export interface ApiErrorOptions {
  status: number;
  errors: unknown;
  url: string;
}

/** The single error type thrown by every framework data call. */
export class ApiError extends Error {
  readonly status: number;
  readonly errors: unknown;
  readonly url: string;

  constructor(message: string, opts: ApiErrorOptions) {
    super(message);
    this.name = 'ApiError';
    this.status = opts.status;
    this.errors = opts.errors;
    this.url = opts.url;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
