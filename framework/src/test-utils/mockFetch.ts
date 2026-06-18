import { vi } from 'vitest';

export interface MockResponse {
  ok?: boolean;
  status?: number;
  /** Parsed JSON body the endpoint returns. */
  json: unknown;
}

/**
 * Installs a fake global.fetch. `route` maps "METHOD url" (url is the full
 * absolute URL) to a MockResponse, or throw to simulate a network error.
 */
export function mockFetch(
  route: (input: { url: string; method: string; body: unknown }) => MockResponse,
): void {
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    const res = route({ url, method, body });
    const status = res.status ?? 200;
    const ok = res.ok ?? (status >= 200 && status < 300);
    return {
      ok,
      status,
      json: async () => res.json,
    } as Response;
  });
}
