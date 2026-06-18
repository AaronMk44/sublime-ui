import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { screen } from '@testing-library/react';
import { renderWeb } from '../../src/test-utils/renderWeb.js';
import { Tooltip } from '../../src/components/Tooltip/index.js';

describe('Tooltip (web)', () => {
  it('renders its wrapped child and sets the tooltip title', () => {
    renderWeb(
      createElement(Tooltip, {
        label: 'More info',
        children: createElement('button', {}, 'Hover me'),
      }),
    );
    // The wrapped child renders...
    const child = screen.getByText('Hover me');
    expect(child).toBeTruthy();
    // ...and MUI applies the tooltip title to it (aria-label === the label).
    expect(child.getAttribute('aria-label')).toBe('More info');
  });
});
