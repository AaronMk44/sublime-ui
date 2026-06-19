import { describe, it, expect } from 'vitest';
import { NativeError, serializeError, deserializeError } from '../src/errors';

describe('native errors', () => {
  it('round-trips a thrown error through serialize/deserialize', () => {
    const s = serializeError(Object.assign(new Error('disk full'), { code: 'ENOSPC' }));
    expect(s).toEqual({ name: 'Error', message: 'disk full', code: 'ENOSPC' });
    const e = deserializeError(s);
    expect(e).toBeInstanceOf(NativeError);
    expect(e.message).toBe('disk full');
    expect(e.code).toBe('ENOSPC');
  });
  it('serializes a non-Error throwable', () => {
    expect(serializeError('boom')).toEqual({ name: 'Error', message: 'boom' });
  });
});
