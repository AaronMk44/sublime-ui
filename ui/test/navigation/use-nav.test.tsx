import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
// react-dom ships no bundled types and @types/react-dom is not installed in this
// workspace; declare the single server entry we use so strict tsc stays happy.
import { renderToStaticMarkup } from 'react-dom/server';
import { NavProvider, useNav } from '../../src/navigation/use-nav';
import type { Nav } from '../../src/navigation/nav.types';

function Probe({ onNav }: { onNav: (current: string) => void }) {
  const nav = useNav();
  onNav(nav.current());
  return null;
}

const fake: Nav = {
  turnTo: () => {},
  turnBack: () => {},
  current: () => 'home',
  params: <T = unknown,>() => undefined as T,
};

describe('useNav', () => {
  it('throws when used outside a provider', () => {
    expect(() => renderToStaticMarkup(createElement(Probe, { onNav: () => {} }))).toThrow(
      /NavProvider missing/,
    );
  });

  it('returns the nav from the nearest NavProvider', () => {
    let seen = '';
    renderToStaticMarkup(
      createElement(NavProvider, {
        value: fake,
        children: createElement(Probe, { onNav: (c: string) => (seen = c) }),
      }),
    );
    expect(seen).toBe('home');
  });
});
