import { getHttpConfig } from '../config/Config.js';
import { HttpError } from './HttpError.js';
import { NetworkError } from '../errors/NetworkError.js';
import { AuthError } from '../errors/AuthError.js';
import { ValidationError } from '../errors/ValidationError.js';
import type { ApiResponse } from '../entities/ApiResponse.js';

export interface RequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/**
 * Performs an HTTP request, unwraps the (HTTP-internal) ApiResponse envelope and
 * returns the RAW `T` (`parsed.data`). Real failures throw a typed DataError:
 *   fetch threw          -> NetworkError
 *   invalid JSON body    -> HttpError
 *   401 / 403            -> AuthError
 *   422                  -> ValidationError
 *   any other non-2xx    -> HttpError   (404 included; HttpGateway maps it to null)
 *   success === false    -> HttpError
 */
async function request<T>(config: RequestConfig): Promise<T> {
  const { baseURL, tokenProvider } = getHttpConfig();
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
    throw new NetworkError(message, { url: fullUrl, cause });
  }

  let parsed: ApiResponse<T>;
  try {
    parsed = (await response.json()) as ApiResponse<T>;
  } catch (cause) {
    throw new HttpError('Invalid JSON response', {
      status: response.status,
      errors: cause,
      url: fullUrl,
    });
  }

  if (!response.ok || parsed.success === false) {
    const message = parsed.message || `Request failed (${response.status})`;
    if (response.status === 401 || response.status === 403) {
      throw new AuthError(message, { status: response.status, cause: parsed.errors });
    }
    if (response.status === 422) {
      throw new ValidationError(message, { fields: parsed.errors, cause: parsed.errors });
    }
    throw new HttpError(message, {
      status: response.status,
      errors: parsed.errors,
      url: fullUrl,
    });
  }
  return parsed.data;
}

export const http = { request };
