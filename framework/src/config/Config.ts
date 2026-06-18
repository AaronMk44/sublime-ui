export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface SublimeConfig {
  baseURL: string;
  tokenProvider: () => Promise<string | null>;
  storageAdapter: StorageAdapter;
  platform: 'mobile' | 'web' | 'desktop';
}

let current: SublimeConfig | null = null;

export function configureSublime(config: SublimeConfig): void {
  current = config;
}

export function getConfig(): SublimeConfig {
  if (current === null) {
    throw new Error(
      'Sublime is not configured. Call configureSublime({ baseURL, tokenProvider, storageAdapter, platform }) at app startup.',
    );
  }
  return current;
}

/** Test-only: clears the configured singleton. */
export function resetConfig(): void {
  current = null;
}
