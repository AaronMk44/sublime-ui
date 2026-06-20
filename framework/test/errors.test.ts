import { describe, it, expect } from 'vitest';
import {
  DataError,
  NetworkError,
  AuthError,
  ValidationError,
  NotFoundError,
  ConfigError,
  StorageError,
  type DataErrorCode,
} from '../src/errors/index.js';

describe('DataError tree', () => {
  it('DataError is an Error with default code "unknown" and no cause', () => {
    const err = new DataError('boom');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(DataError);
    expect(err.name).toBe('DataError');
    expect(err.message).toBe('boom');
    expect(err.code).toBe('unknown');
    expect(err.cause).toBeUndefined();
  });

  it('DataError honors an explicit code and propagates cause', () => {
    const root = new Error('root');
    const err = new DataError('wrapped', { code: 'storage', cause: root });
    expect(err.code).toBe('storage');
    expect(err.cause).toBe(root);
  });

  it('every subclass is instanceof DataError and instanceof Error (new.target fix)', () => {
    const subclasses: Array<[DataError, DataErrorCode, string]> = [
      [new NetworkError('n'), 'network', 'NetworkError'],
      [new AuthError('a'), 'auth', 'AuthError'],
      [new ValidationError('v'), 'validation', 'ValidationError'],
      [new NotFoundError('nf'), 'not_found', 'NotFoundError'],
      [new ConfigError('c'), 'config', 'ConfigError'],
      [new StorageError('s'), 'storage', 'StorageError'],
    ];
    for (const [err, code, name] of subclasses) {
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(DataError);
      expect(err.name).toBe(name);
      expect(err.code).toBe(code);
    }
  });

  it('NetworkError carries an optional url', () => {
    const err = new NetworkError('offline', { url: 'https://api.example.com/users' });
    expect(err).toBeInstanceOf(DataError);
    expect(err.url).toBe('https://api.example.com/users');
  });

  it('AuthError carries an optional status', () => {
    const err = new AuthError('forbidden', { status: 403 });
    expect(err.status).toBe(403);
  });

  it('ValidationError carries optional fields (reserved for SP3)', () => {
    const err = new ValidationError('invalid', { fields: { title: ['required'] } });
    expect(err.fields).toEqual({ title: ['required'] });
  });

  it('NotFoundError carries optional resource and id', () => {
    const err = new NotFoundError('notes#7 not found', { resource: 'notes', id: 7 });
    expect(err.resource).toBe('notes');
    expect(err.id).toBe(7);
  });

  it('ConfigError and StorageError default to their fixed codes', () => {
    expect(new ConfigError('missing baseURL').code).toBe('config');
    expect(new StorageError('driver failed').code).toBe('storage');
  });

  it('cause propagates through a subclass constructor', () => {
    const root = new Error('disk full');
    const err = new StorageError('insert failed', { cause: root });
    expect(err.cause).toBe(root);
  });
});
