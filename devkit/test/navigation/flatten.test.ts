import { describe, it, expect } from 'vitest';
import { flatten } from '../../src/lib/navigation/flatten';

const tree = {
  key: 'root', kind: 'book', format: 'bottomNav', options: {},
  children: [
    { key: 'home', kind: 'page', component: 'Home', options: {} },
    { key: 'settings', kind: 'book', format: 'stack', options: {}, children: [
      { key: 'profile', kind: 'page', component: 'Profile', options: {} },
    ] },
  ],
} as const;

describe('flatten', () => {
  it('produces a flat route list with prefixed nested paths', () => {
    const { routes } = flatten(tree as any);
    expect(routes.map(r => r.key)).toEqual(['home', 'profile']);
    expect(routes.find(r => r.key === 'profile')?.path).toBe('/settings/profile');
  });
});
