import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
// react-dom ships no bundled types and @types/react-dom is not installed in
// this workspace; the single server entry we use is declared in
// test/react-dom-server.d.ts so strict tsc stays happy.
import { renderToStaticMarkup } from 'react-dom/server';
import { Stack } from '../../src/layout/Stack';

describe('Stack (web)', () => {
  it('renders children in order with flexDirection column', () => {
    const html = renderToStaticMarkup(
      createElement(Stack, {
        testID: 'st',
        children: [
          createElement('span', { key: 'a' }, 'a'),
          createElement('span', { key: 'b' }, 'b'),
        ],
      }),
    );
    expect(html).toContain('flex-direction:column');
    expect(html).toContain('data-testid="st"');
    expect(html.indexOf('a')).toBeLessThan(html.indexOf('b'));
  });
});
