/**
 * Back-compat shim. `ApiError` was renamed to `HttpError` in 0.2.0; this module
 * re-exports the new class under both names so existing imports and
 * `instanceof ApiError` keep working. The runtime `.name` is now 'HttpError'.
 */
import { HttpError } from './HttpError.js';

export { HttpError } from './HttpError.js';
export type { HttpErrorOptions } from './HttpError.js';
export type { HttpErrorOptions as ApiErrorOptions } from './HttpError.js';

/** `ApiError` is the former name for {@link HttpError}; kept as a value+type alias. */
export const ApiError = HttpError;
export type ApiError = HttpError;
