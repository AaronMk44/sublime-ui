import { describe, it, expect, afterEach } from 'vitest';
import { createElement } from 'react';
import { screen, cleanup } from '@testing-library/react';
import { renderWeb } from '../../src/test-utils/renderWeb.js';
import { Icon } from '../../src/components/Icon/index.js';

describe('Icon (web)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the material icon name', () => {
    renderWeb(createElement(Icon, { name: 'home' }));
    expect(screen.getByText('home')).toBeTruthy();
  });

  it('renders a passthrough node when provided and omits the name span', () => {
    renderWeb(
      createElement(Icon, { name: 'home', node: createElement('svg', { 'data-testid': 'custom' }) }),
    );
    expect(screen.getByTestId('custom')).toBeTruthy();
    expect(screen.queryByText('home')).toBeNull();
  });

  it('applies a token color', () => {
    renderWeb(createElement(Icon, { name: 'star', color: 'primary', testID: 'icn' }));
    const el = screen.getByText('star');
    expect(getComputedStyle(el).color).not.toBe('');
  });
});
