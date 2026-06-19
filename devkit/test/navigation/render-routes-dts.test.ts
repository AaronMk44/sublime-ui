import { describe, it, expect } from 'vitest';
import { renderRoutesDts } from '../../src/lib/navigation/render-routes-dts';

describe('renderRoutesDts', () => {
  it('emits a route map entry per route', () => {
    const out = renderRoutesDts([
      { key: 'home', params: 'void' },
      { key: 'product', params: '{ id: number }' },
    ]);
    expect(out).toContain('home: void;');
    expect(out).toContain('product: { id: number };');
  });

  it('declares an exported AppRoutes interface', () => {
    const out = renderRoutesDts([{ key: 'home', params: 'void' }]);
    expect(out).toContain('export interface AppRoutes');
  });
});
