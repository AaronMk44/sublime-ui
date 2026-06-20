import { DataError, type DataErrorOptions } from './DataError.js';

/** DB driver / transport failure: duplicate id, missing JSON1, IPC error. */
export class StorageError extends DataError {
  constructor(message: string, opts: Omit<DataErrorOptions, 'code'> = {}) {
    super(message, { code: 'storage', cause: opts.cause });
  }
}
