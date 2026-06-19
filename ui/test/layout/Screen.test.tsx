import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
// react-dom ships no bundled types and @types/react-dom is not installed in
// this workspace; the single server entry we use is declared in
// test/react-dom-server.d.ts so strict tsc stays happy.
import { renderToStaticMarkup } from 'react-dom/server';
import { Screen } from '../../src/layout/Screen';

describe('Screen (web)', () => {
  it('renders a <main> with the given children and testID', () => {
    const html = renderToStaticMarkup(
      createElement(Screen, {
        testID: 's',
        children: createElement('span', null, 'hi'),
      }),
    );
    expect(html).toContain('<main');
    expect(html).toContain('data-testid="s"');
    expect(html).toContain('<span>hi</span>');
  });

  it('drops padding when padded is false', () => {
    const html = renderToStaticMarkup(
      createElement(Screen, { padded: false, children: 'x' }),
    );
    expect(html).toContain('padding:0');
  });
});
