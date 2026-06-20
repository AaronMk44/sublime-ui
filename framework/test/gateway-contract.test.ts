import { describe, it, expect } from 'vitest';
import {
  isRequestCapable,
  type Gateway,
  type RequestCapableGateway,
  type Row,
  type Id,
} from '../src/gateway/Gateway.js';

// A minimal Gateway with NO request() — must be classified non-request-capable.
const plain: Gateway = {
  async index(): Promise<Row[]> {
    return [];
  },
  async show(_id: Id): Promise<Row | null> {
    return null;
  },
  async create(body: Row): Promise<Row> {
    return body;
  },
  async update(_id: Id, body: Row): Promise<Row> {
    return body;
  },
  async destroy(_id: Id): Promise<void> {},
};

// A Gateway that ALSO has request() — must be classified request-capable.
const capable: RequestCapableGateway = {
  ...plain,
  async request<T>(): Promise<T> {
    return undefined as T;
  },
};

describe('Gateway contract', () => {
  it('isRequestCapable returns true when request() is present', () => {
    expect(isRequestCapable(capable)).toBe(true);
  });

  it('isRequestCapable returns false when request() is absent', () => {
    expect(isRequestCapable(plain)).toBe(false);
  });

  it('isRequestCapable returns false when request is not a function', () => {
    const fake = { ...plain, request: 'nope' } as unknown as Gateway;
    expect(isRequestCapable(fake)).toBe(false);
  });

  it('narrows the type so request() is callable after the guard', async () => {
    const g: Gateway = capable;
    if (isRequestCapable(g)) {
      await expect(g.request<number>({ url: '/x' })).resolves.toBeUndefined();
    } else {
      throw new Error('expected request-capable');
    }
  });
});
