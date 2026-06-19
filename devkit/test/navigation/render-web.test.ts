import { describe, it, expect } from 'vitest';
import { renderWeb } from '../../src/lib/navigation/render-web';

const tree = {
  key: 'root',
  kind: 'book',
  format: 'sidebar',
  options: {},
  children: [
    { key: 'home', kind: 'page', component: 'Home', options: {} },
    { key: 'product', kind: 'page', component: 'Product', options: {} },
  ],
} as const;

describe('renderWeb', () => {
  it('emits a <Routes> tree', () => {
    const out = renderWeb(tree as any, { screensImport: './screens' });
    expect(out).toContain('<Routes>');
  });

  it('emits a layout wrapper route for a sidebar root', () => {
    const out = renderWeb(tree as any, { screensImport: './screens' });
    expect(out).toContain('<Route path="/" element={<Sidebar');
  });

  it('emits a child route for a page', () => {
    const out = renderWeb(tree as any, { screensImport: './screens' });
    expect(out).toContain('<Route path="product"');
  });

  it('emits the pathOf map', () => {
    const out = renderWeb(tree as any, { screensImport: './screens' });
    expect(out).toContain('pathOf');
  });

  it('bridges through NavProvider via useWebNav(pathOf, nameOf)', () => {
    const out = renderWeb(tree as any, { screensImport: './screens' });
    expect(out).toContain('NavProvider');
    expect(out).toContain('useWebNav(pathOf, nameOf)');
  });
});
