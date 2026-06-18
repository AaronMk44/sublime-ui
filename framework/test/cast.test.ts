import { describe, it, expect } from 'vitest';
import { hydrate, toPlain } from '../src/model/cast.js';

class Sample {
  declare id: number;
  declare price: number;
  get withTax(): number {
    return this.price * 1.1;
  }
}

describe('cast', () => {
  it('hydrate assigns data and exposes prototype getters', () => {
    const s = hydrate(Sample, { id: 1, price: 100 });
    expect(s).toBeInstanceOf(Sample);
    expect(s.id).toBe(1);
    expect(s.price).toBe(100);
    expect(s.withTax).toBeCloseTo(110);
  });

  it('toPlain returns only own data — getters excluded', () => {
    const s = hydrate(Sample, { id: 1, price: 100 });
    const plain = toPlain(s);
    expect(plain).toEqual({ id: 1, price: 100 });
    expect('withTax' in plain).toBe(false);
    // plain object is not a class instance
    expect(Object.getPrototypeOf(plain)).toBe(Object.prototype);
  });

  it('round-trips', () => {
    const s = hydrate(Sample, { id: 2, price: 50 });
    expect(toPlain(s)).toEqual({ id: 2, price: 50 });
  });
});
