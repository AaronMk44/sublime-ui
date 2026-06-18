import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { screen } from '@testing-library/react';
import { renderWeb } from '../../src/test-utils/renderWeb.js';
import { Divider } from '../../src/components/Divider/index.js';

describe('Divider (web)', () => {
  it('renders a separator', () => {
    renderWeb(createElement(Divider, { testID: 'div' }));
    const el = screen.getByTestId('div');
    expect(el).toBeTruthy();
    expect(screen.getByRole('separator')).toBe(el);
  });

  it('uses vertical orientation when vertical', () => {
    renderWeb(createElement(Divider, { vertical: true, testID: 'vdiv' }));
    const el = screen.getByTestId('vdiv');
    expect(el.getAttribute('aria-orientation')).toBe('vertical');
  });
});
