import { describe, it, expect, afterEach } from 'vitest';
import { createElement } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { SublimeProvider } from '../src/provider/SublimeProvider.js';
import { useTokens } from '../src/provider/useTokens.js';

function Probe() {
  const t = useTokens();
  return createElement('span', { 'data-testid': 'mode' }, t.mode);
}

afterEach(cleanup);

describe('SublimeProvider (web)', () => {
  it('supplies resolved tokens for the active mode', () => {
    render(createElement(SublimeProvider, { mode: 'dark', children: createElement(Probe) }));
    expect(screen.getByTestId('mode').textContent).toBe('dark');
  });
  it('defaults to light mode', () => {
    render(createElement(SublimeProvider, { children: createElement(Probe) }));
    expect(screen.getByTestId('mode').textContent).toBe('light');
  });
});
