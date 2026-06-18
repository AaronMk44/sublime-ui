import { describe, it, expect } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { render, screen, act } from '@testing-library/react';
import { NotificationProvider } from '../src/notifications/NotificationContext.js';
import { NotificationHost } from '../src/notifications/NotificationHost.js';
import { useNotify } from '../src/notifications/useNotify.js';

function Trigger() {
  const { success } = useNotify();
  return createElement('button', { onClick: () => success('Hello there') }, 'go');
}

describe('NotificationHost (web)', () => {
  it('renders a queued notification message', () => {
    const wrapper = (ui: ReactNode) =>
      render(createElement(NotificationProvider, { children: [ui, createElement(NotificationHost, { key: 'h' })] }));
    wrapper(createElement(Trigger, { key: 't' }));
    act(() => { screen.getByText('go').click(); });
    expect(screen.getByText('Hello there')).toBeTruthy();
  });
});
