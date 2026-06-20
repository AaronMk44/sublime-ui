import { describe, it, expect } from 'vitest';
import { ApiError } from '../src/gateway/ApiError.js';
import { HttpError } from '../src/gateway/HttpError.js';
import { DataError } from '../src/errors/index.js';

describe('ApiError (back-compat shim for HttpError)', () => {
  it('is an Error/DataError/HttpError carrying status, errors, and url', () => {
    const err = new ApiError('Not found', {
      status: 404,
      errors: { id: ['missing'] },
      url: '/users/1',
    });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(DataError);
    expect(err).toBeInstanceOf(HttpError);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.name).toBe('HttpError');
    expect(err.code).toBe('http');
    expect(err.message).toBe('Not found');
    expect(err.status).toBe(404);
    expect(err.errors).toEqual({ id: ['missing'] });
    expect(err.url).toBe('/users/1');
  });

  it('ApiError is the same value as HttpError', () => {
    expect(ApiError).toBe(HttpError);
  });

  it('HttpError propagates an optional cause', () => {
    const root = new Error('socket hang up');
    const err = new HttpError('upstream failed', {
      status: 502,
      errors: null,
      url: '/users',
      cause: root,
    });
    expect(err.cause).toBe(root);
    expect(err).toBeInstanceOf(DataError);
  });
});
