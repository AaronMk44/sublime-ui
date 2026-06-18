import { http, type RequestConfig } from './http.js';
import type { ApiResponse } from '../entities/ApiResponse.js';

export class Gateway {
  constructor(private readonly resource: string) {}

  index<T>(query?: Record<string, string | number>): Promise<ApiResponse<T>> {
    const qs =
      query && Object.keys(query).length > 0
        ? '?' +
          Object.entries(query)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
            .join('&')
        : '';
    return http.request<T>({ url: `${this.resource}${qs}` });
  }

  show<T>(id: string | number): Promise<ApiResponse<T>> {
    return http.request<T>({ url: `${this.resource}/${id}` });
  }

  create<T>(body: unknown): Promise<ApiResponse<T>> {
    return http.request<T>({ url: this.resource, method: 'POST', body });
  }

  update<T>(id: string | number, body: unknown): Promise<ApiResponse<T>> {
    return http.request<T>({ url: `${this.resource}/${id}`, method: 'PUT', body });
  }

  destroy<T>(id: string | number): Promise<ApiResponse<T>> {
    return http.request<T>({ url: `${this.resource}/${id}`, method: 'DELETE' });
  }

  request<T>(config: RequestConfig): Promise<ApiResponse<T>> {
    return http.request<T>(config);
  }
}
