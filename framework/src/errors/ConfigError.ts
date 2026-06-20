import { DataError, type DataErrorOptions } from './DataError.js';

/** Missing required configuration: baseURL (HTTP) or databaseAdapter (DB). */
export class ConfigError extends DataError {
  constructor(message: string, opts: Omit<DataErrorOptions, 'code'> = {}) {
    super(message, { code: 'config', cause: opts.cause });
  }
}
