import { describe, it, expect } from 'vitest';
import { mergeRouteParams } from '../../src/lib/navigation/merge-route-params';

describe('mergeRouteParams', () => {
  it('defaults a route with no captured param to void', () => {
    const { routes, conflicts } = mergeRouteParams({
      nativeKeys: ['home'],
      webKeys: ['home'],
      nativeParams: new Map(),
      webParams: new Map(),
    });
    expect(conflicts).toEqual([]);
    expect(routes).toEqual([{ key: 'home', params: 'void' }]);
  });

  it('uses the captured param type for a route', () => {
    const { routes } = mergeRouteParams({
      nativeKeys: ['home', 'product'],
      webKeys: ['home', 'product'],
      nativeParams: new Map([['product', '{ id: number }']]),
      webParams: new Map([['product', '{ id: number }']]),
    });
    expect(routes.find((r) => r.key === 'product')?.params).toBe('{ id: number }');
  });

  it('unions keys from both platforms (web-only and native-only pages)', () => {
    const { routes } = mergeRouteParams({
      nativeKeys: ['home', 'mobileOnly'],
      webKeys: ['home', 'webOnly'],
      nativeParams: new Map(),
      webParams: new Map(),
    });
    expect(routes.map((r) => r.key).sort()).toEqual(['home', 'mobileOnly', 'webOnly']);
  });

  it('inherits a param from whichever platform declares it when the other omits it', () => {
    const { routes, conflicts } = mergeRouteParams({
      nativeKeys: ['product'],
      webKeys: ['product'],
      nativeParams: new Map([['product', '{ id: number }']]),
      webParams: new Map(),
    });
    expect(conflicts).toEqual([]);
    expect(routes.find((r) => r.key === 'product')?.params).toBe('{ id: number }');
  });

  it('reports a conflict when both platforms declare a key with disagreeing params', () => {
    const { conflicts } = mergeRouteParams({
      nativeKeys: ['product'],
      webKeys: ['product'],
      nativeParams: new Map([['product', '{ id: number }']]),
      webParams: new Map([['product', '{ id: string }']]),
    });
    expect(conflicts).toContain('product');
  });
});
