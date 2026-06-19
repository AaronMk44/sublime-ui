import { describe, it, expect } from 'vitest';
import { validate } from '../../src/lib/navigation/validate';

const page = (key: string) => ({ key, kind: 'page', component: key, options: {} });

describe('validate', () => {
  it('flags bottomNav with >5 pages', () => {
    const root = { key: 'r', kind: 'book', format: 'bottomNav', options: {},
      children: ['a','b','c','d','e','f'].map(page) } as any;
    const d = validate(root, 'mobile');
    expect(d.some(x => x.rule === 'bottomNav-max-5')).toBe(true);
  });
  it('flags a web format used on mobile', () => {
    const root = { key: 'r', kind: 'book', format: 'sidebar', options: {}, children: [page('a')] } as any;
    expect(validate(root, 'mobile').some(x => x.rule === 'format-platform')).toBe(true);
  });
  it('flags duplicate keys across nested books', () => {
    const root = { key: 'r', kind: 'book', format: 'stack', options: {}, children: [
      page('dup'), { key: 'sub', kind: 'book', format: 'stack', options: {}, children: [page('dup')] },
    ] } as any;
    expect(validate(root, 'mobile').some(x => x.rule === 'duplicate-key')).toBe(true);
  });

  it('flags a book with more than one initial child (multiple-initial)', () => {
    const root = { key: 'r', kind: 'book', format: 'stack', options: {}, children: [
      { key: 'a', kind: 'page', component: 'A', options: { initial: true } },
      { key: 'b', kind: 'page', component: 'B', options: { initial: true } },
    ] } as any;
    const d = validate(root, 'mobile');
    expect(d.some(x => x.rule === 'multiple-initial')).toBe(true);
  });

  it('does not flag multiple-initial when exactly one child is initial', () => {
    const root = { key: 'r', kind: 'book', format: 'stack', options: {}, children: [
      { key: 'a', kind: 'page', component: 'A', options: { initial: true } },
      { key: 'b', kind: 'page', component: 'B', options: {} },
    ] } as any;
    expect(validate(root, 'mobile').some(x => x.rule === 'multiple-initial')).toBe(false);
  });

  it('flags a page with no component (dangling)', () => {
    const root = { key: 'r', kind: 'book', format: 'stack', options: {}, children: [
      { key: 'a', kind: 'page', options: {} },
    ] } as any;
    const d = validate(root, 'mobile');
    expect(d.some(x => x.rule === 'dangling')).toBe(true);
  });

  it('flags a book with no children (dangling)', () => {
    const root = { key: 'r', kind: 'book', format: 'stack', options: {}, children: [] } as any;
    expect(validate(root, 'mobile').some(x => x.rule === 'dangling')).toBe(true);
  });

  it('flags a link whose target is not a book (bad-link) with a clear fix', () => {
    const root = { key: 'r', kind: 'book', format: 'stack', options: {}, children: [
      { key: 'broken', kind: 'book', options: {}, linkError: 'link("broken") does not reference a book().' },
    ] } as any;
    const d = validate(root, 'mobile');
    const badLink = d.find(x => x.rule === 'bad-link');
    expect(badLink).toBeDefined();
    expect(badLink?.message).toContain('broken');
  });
});
