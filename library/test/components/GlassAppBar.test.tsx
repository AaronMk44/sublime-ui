import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWeb } from '../../src/test-utils/renderWeb.js';
import { GlassAppBar } from '../../src/components/GlassAppBar/index.js';
import { defaultTokens } from '../../src/tokens/tokens.js';

describe('GlassAppBar (web)', () => {
  it('renders its title', () => {
    renderWeb(createElement(GlassAppBar, { title: 'Glass' }));
    expect(screen.getByText('Glass')).toBeTruthy();
  });

  it('fires onBack when the back action is clicked', () => {
    const onBack = vi.fn();
    renderWeb(createElement(GlassAppBar, { title: 'Details', onBack }));
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('applies the glass background', () => {
    renderWeb(createElement(GlassAppBar, { title: 'Glass', testID: 'glass-bar' }));
    const bar = screen.getByTestId('glass-bar');
    const bg = bar.style.backgroundColor || getComputedStyle(bar).backgroundColor;
    // jsdom normalizes the color string (whitespace/precision) — compare channels.
    const channels = (s: string) => (s.match(/[\d.]+/g) ?? []).map(Number);
    expect(channels(bg)).toEqual(channels(defaultTokens.color.light.glassBg));
  });
});
