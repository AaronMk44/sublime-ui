import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement } from 'react';
import { renderWeb } from '../../src/test-utils/renderWeb.js';
import { Drawer } from '../../src/components/Drawer/index.js';
import type { NavItem } from '../../src/components/common.js';

const items: NavItem[] = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'orders', label: 'Orders', icon: 'receipt', badge: 5 },
];

describe('Drawer (web stub)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing on web (mobile-only)', () => {
    const { container } = renderWeb(
      createElement(Drawer, { items, activeKey: 'home', onSelect: () => {} }),
    );
    expect(container.firstChild).toBeNull();
  });

  it('warns that it is mobile-only outside production', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderWeb(createElement(Drawer, { items, activeKey: 'home', onSelect: () => {} }));
    expect(warn).toHaveBeenCalledWith('Drawer is mobile-only');
  });
});
