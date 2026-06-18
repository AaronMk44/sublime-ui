import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { screen } from '@testing-library/react';
import { renderWeb } from '../../src/test-utils/renderWeb.js';
import { Spinner } from '../../src/components/Spinner/index.js';

describe('Spinner (web)', () => {
  it('renders a progressbar', () => {
    renderWeb(createElement(Spinner, { testID: 'spin' }));
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('forwards testID', () => {
    renderWeb(createElement(Spinner, { testID: 'spin' }));
    expect(screen.getAllByTestId('spin').length).toBeGreaterThan(0);
  });
});
