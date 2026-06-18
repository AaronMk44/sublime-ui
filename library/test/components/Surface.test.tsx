import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { screen } from '@testing-library/react';
import { renderWeb } from '../../src/test-utils/renderWeb.js';
import { Surface } from '../../src/components/Surface/index.js';
import { defaultTokens } from '../../src/tokens/tokens.js';

describe('Surface (web)', () => {
  it('renders its children', () => {
    renderWeb(createElement(Surface, { children: 'Panel' }));
    expect(screen.getByText('Panel')).toBeTruthy();
  });

  it('applies shadows.md for elevation md', () => {
    renderWeb(
      createElement(Surface, {
        elevation: 'md',
        testID: 'surf',
        children: 'Body',
      }),
    );
    const el = screen.getByTestId('surf');
    expect(getComputedStyle(el).boxShadow).toBe(defaultTokens.shadows.md);
  });

  it('applies no shadow for elevation none', () => {
    renderWeb(
      createElement(Surface, {
        elevation: 'none',
        testID: 'flat',
        children: 'Flat',
      }),
    );
    const el = screen.getByTestId('flat');
    expect(getComputedStyle(el).boxShadow).toBe('none');
  });
});
