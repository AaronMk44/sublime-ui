import { describe, it, expect } from 'vitest';
import { extractParams } from '../../src/lib/navigation/extract-params';

// A storybook source authored with `page<...>()` type arguments. The extractor
// reads the source with the TS compiler API and maps each page property key to
// the TS type-argument string (or `void` when no type argument is present).
const SOURCE = `import { book, link, page } from '@sublime-ui/ui/navigation';

function Home() { return null; }
function ProductDetail() { return null; }
function Profile() { return null; }

const settingsBook = book({
  format: 'stack',
  pages: {
    profile: page(Profile, { title: 'Profile' }),
  },
});

export default book({
  format: 'bottomNav',
  pages: {
    home: page(Home, { title: 'Home' }),
    product: page<{ id: number }>(ProductDetail, { title: 'Product' }),
    settings: link(settingsBook, { title: 'Settings' }),
  },
});
`;

describe('extractParams', () => {
  it('captures the explicit type argument of a page<...>() call by key', () => {
    const map = extractParams(SOURCE);
    expect(map.get('product')).toBe('{ id: number }');
  });

  it('omits keys for pages with no type argument (caller defaults to void)', () => {
    const map = extractParams(SOURCE);
    expect(map.has('home')).toBe(false);
    expect(map.has('profile')).toBe(false);
  });

  it('does not capture link() entries as params', () => {
    const map = extractParams(SOURCE);
    expect(map.has('settings')).toBe(false);
  });

  it('captures a named-type argument verbatim', () => {
    const map = extractParams(
      `import { page } from '@sublime-ui/ui/navigation';
       export default book({ format: 'stack', pages: {
         order: page<OrderParams>(Order),
       }});`,
    );
    expect(map.get('order')).toBe('OrderParams');
  });

  it('returns an empty map for source with no page calls', () => {
    expect(extractParams('export const x = 1;').size).toBe(0);
  });
});
