import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWeb } from '../../src/test-utils/renderWeb.js';
import { AppBar } from '../../src/components/AppBar/index.js';

describe('AppBar (web)', () => {
  it('renders its title', () => {
    renderWeb(createElement(AppBar, { title: 'Dashboard' }));
    expect(screen.getByText('Dashboard')).toBeTruthy();
  });

  it('fires onBack when the back action is clicked', () => {
    const onBack = vi.fn();
    renderWeb(createElement(AppBar, { title: 'Details', onBack }));
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
