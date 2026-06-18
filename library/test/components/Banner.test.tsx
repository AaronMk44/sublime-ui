import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWeb } from '../../src/test-utils/renderWeb.js';
import { Banner } from '../../src/components/Banner/index.js';

describe('Banner (web)', () => {
  it('renders its message', () => {
    renderWeb(createElement(Banner, { children: 'Heads up!' }));
    expect(screen.getByText('Heads up!')).toBeTruthy();
  });

  it('renders the title when provided', () => {
    renderWeb(
      createElement(Banner, { title: 'Notice', children: 'Body text' }),
    );
    expect(screen.getByText('Notice')).toBeTruthy();
  });

  it('fires onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    renderWeb(createElement(Banner, { onClose, children: 'Closable' }));
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
