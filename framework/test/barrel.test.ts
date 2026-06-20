import { describe, it, expect } from 'vitest';
import * as Sublime from '../src/index.js';
import {
  Model,
  ModelCollection,
  registerModel,
  configureSublime,
  getConfig,
  getHttpConfig,
  getDatabaseAdapter,
  ApiError,
  HttpError,
  DataError,
  NetworkError,
  AuthError,
  ValidationError,
  NotFoundError,
  ConfigError,
  StorageError,
  HttpGateway,
  InMemoryGateway,
  DbGateway,
  isRequestCapable,
  store,
  registerReducer,
  useAppDispatch,
  useAppSelector,
} from '../src/index.js';

describe('public barrel (@sublime-ui/framework)', () => {
  it('exports the value runtime surface', () => {
    expect(Model).toBeTypeOf('function');
    expect(ModelCollection).toBeTypeOf('function');
    expect(registerModel).toBeTypeOf('function');
    expect(configureSublime).toBeTypeOf('function');
    expect(getConfig).toBeTypeOf('function');
    expect(getHttpConfig).toBeTypeOf('function');
    expect(getDatabaseAdapter).toBeTypeOf('function');
    expect(store).toBeTypeOf('object');
    expect(registerReducer).toBeTypeOf('function');
    expect(useAppDispatch).toBeTypeOf('function');
    expect(useAppSelector).toBeTypeOf('function');
    expect(isRequestCapable).toBeTypeOf('function');
  });

  it('exports the three gateway strategy classes', () => {
    expect(HttpGateway).toBeTypeOf('function');
    expect(InMemoryGateway).toBeTypeOf('function');
    expect(DbGateway).toBeTypeOf('function');
  });

  it('exports the full DataError tree', () => {
    for (const E of [DataError, HttpError, NetworkError, AuthError, ValidationError, NotFoundError, ConfigError, StorageError]) {
      expect(E).toBeTypeOf('function');
    }
    expect(HttpError.prototype).toBeInstanceOf(DataError);
  });

  it('keeps ApiError as a back-compat alias of HttpError', () => {
    expect(ApiError).toBe(HttpError);
  });

  it('no longer exports a constructable Gateway', () => {
    expect((Sublime as Record<string, unknown>)['Gateway']).toBeUndefined();
  });
});
