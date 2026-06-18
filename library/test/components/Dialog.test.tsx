import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWeb } from '../../src/test-utils/renderWeb.js';
import { Dialog } from '../../src/components/Dialog/index.js';

describe('Dialog (web)', () => {
  it('shows its title and children when open', () => {
    renderWeb(
      createElement(Dialog, {
        open: true,
        onClose: vi.fn(),
        title: 'Confirm',
        children: 'Are you sure?',
      }),
    );
    expect(screen.getByText('Confirm')).toBeTruthy();
    expect(screen.getByText('Are you sure?')).toBeTruthy();
  });

  it('fires onClose when the close button is pressed', () => {
    const onClose = vi.fn();
    renderWeb(
      createElement(Dialog, {
        open: true,
        onClose,
        title: 'Confirm',
        children: 'Body',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
