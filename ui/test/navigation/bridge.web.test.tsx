import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { useWebNav } from '../../src/navigation/bridge.web';

const navigateSpy = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateSpy,
  };
});

const pathOf = (name: string, params?: unknown) => {
  const p = params as { id?: number } | undefined;
  return name === 'product' ? `/product/${p?.id}` : `/${name}`;
};
const nameOf = (path: string) => (path === '/' ? 'home' : path.slice(1).split('/')[0]!);

function Probe() {
  const nav = useWebNav(pathOf, nameOf);
  nav.turnTo('product', { id: 1 });
  return null;
}

describe('useWebNav', () => {
  it('navigates to the path produced by pathOf', () => {
    navigateSpy.mockClear();
    renderToStaticMarkup(
      createElement(MemoryRouter, { children: createElement(Probe) }),
    );
    expect(navigateSpy).toHaveBeenCalledWith('/product/1');
  });
});
