import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement } from 'react';
import { renderWeb } from '../../src/test-utils/renderWeb.js';
import { BottomNav } from '../../src/components/BottomNav/index.js';
import type { NavItem } from '../../src/components/common.js';

const items: NavItem[] = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'cart', label: 'Cart', icon: 'cart', badge: 3 },
];

describe('BottomNav (web stub)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing on web (mobile-only)', () => {
    const { container } = renderWeb(
      createElement(BottomNav, { items, activeKey: 'home', onSelect: () => {} }),
    );
    expect(container.firstChild).toBeNull();
  });

  it('warns that it is mobile-only outside production', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderWeb(
      createElement(BottomNav, { items, activeKey: 'home', onSelect: () => {} }),
    );
    expect(warn).toHaveBeenCalledWith('BottomNav is mobile-only');
  });
});
