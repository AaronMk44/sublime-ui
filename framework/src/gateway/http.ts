import { getConfig } from '../config/Config.js';
import { ApiError } from './ApiError.js';
import type { ApiResponse } from '../entities/ApiResponse.js';

export interface RequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

async function request<T>(config: RequestConfig): Promise<ApiResponse<T>> {
  const { baseURL, tokenProvider } = getConfig();
  const fullUrl = `${baseURL}${config.url}`;
  const token = await tokenProvider();

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token !== null) headers['Authorization'] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      method: config.method ?? 'GET',
      headers,
      ...(config.body === undefined ? {} : { body: JSON.stringify(config.body) }),
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Network request failed';
    throw new ApiError(message, { status: 0, errors: cause, url: fullUrl });
  }

  let parsed: ApiResponse<T>;
  try {
    parsed = (await response.json()) as ApiResponse<T>;
  } catch (cause) {
    throw new ApiError('Invalid JSON response', {
      status: response.status,
      errors: cause,
      url: fullUrl,
    });
  }

  if (!response.ok || parsed.success === false) {
    throw new ApiError(parsed.message || `Request failed (${response.status})`, {
      status: response.status,
      errors: parsed.errors,
      url: fullUrl,
    });
  }
  return parsed;
}

export const http = { request };
