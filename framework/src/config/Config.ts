import { ConfigError } from '../errors/ConfigError.js';
import type { DatabaseAdapter } from '../gateway/DatabaseAdapter.js';

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface SublimeConfig {
  /** Required only if a model uses HttpGateway. */
  baseURL?: string;
  /** Defaults to "no token" when omitted. */
  tokenProvider?: () => Promise<string | null>;
  /** Required only if a model uses DbGateway (document store). */
  databaseAdapter?: DatabaseAdapter;
  /** KV string store (separate port from databaseAdapter); now optional. */
  storageAdapter?: StorageAdapter;
  /** Always required — drives platform auto-selection. */
  platform: 'mobile' | 'web' | 'desktop';
}

let current: SublimeConfig | null = null;

export function configureSublime(config: SublimeConfig): void {
  current = config;
}

export function getConfig(): SublimeConfig {
  if (current === null) {
    throw new ConfigError(
      'Sublime is not configured. Call configureSublime({ platform, baseURL?, tokenProvider?, databaseAdapter?, storageAdapter? }) at app startup.',
    );
  }
  return current;
}

/**
 * HTTP config for HttpGateway. Validated lazily so a local-only/in-memory app
 * is not forced to supply a baseURL. Throws ConfigError if baseURL is missing.
 */
export function getHttpConfig(): {
  baseURL: string;
  tokenProvider: () => Promise<string | null>;
} {
  const cfg = getConfig();
  if (cfg.baseURL === undefined || cfg.baseURL === '') {
    throw new ConfigError(
      'HttpGateway requires a baseURL. Call configureSublime({ baseURL: "https://api.example.com", platform }).',
    );
  }
  return {
    baseURL: cfg.baseURL,
    tokenProvider: cfg.tokenProvider ?? (async () => null),
  };
}

/**
 * Document-store adapter for DbGateway. Validated lazily. Throws ConfigError if
 * no databaseAdapter was configured.
 */
export function getDatabaseAdapter(): DatabaseAdapter {
  const cfg = getConfig();
  if (cfg.databaseAdapter === undefined) {
    throw new ConfigError(
      'DbGateway requires a databaseAdapter. Call configureSublime({ databaseAdapter: createDatabaseAdapter(), platform }).',
    );
  }
  return cfg.databaseAdapter;
}

/** Test-only: clears the configured singleton. */
export function resetConfig(): void {
  current = null;
}
