import { describe, it, expect } from 'vitest';
import { ApiError } from '../src/gateway/ApiError.js';

describe('ApiError', () => {
  it('is an Error carrying status, errors, and url', () => {
    const err = new ApiError('Not found', {
      status: 404,
      errors: { id: ['missing'] },
      url: '/users/1',
    });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.name).toBe('ApiError');
    expect(err.message).toBe('Not found');
    expect(err.status).toBe(404);
    expect(err.errors).toEqual({ id: ['missing'] });
    expect(err.url).toBe('/users/1');
  });
});
