import { describe, it, expect } from 'vitest';
import {
  renderComponentTypes, renderComponentWeb, renderComponentNative, renderComponentIndex,
} from '../../src/lib/generators/render-component.js';

describe('render-component', () => {
  it('types: shared prop interface', () => {
    const out = renderComponentTypes('Card');
    expect(out).toContain('export interface CardProps {');
    expect(out).toContain('children');
  });
  it('web: MUI impl importing useTokens', () => {
    const out = renderComponentWeb('Card', false, '@sublime-ui');
    expect(out).toContain("from '@sublime-ui/library'");
    expect(out).toContain('export function Card(');
    expect(out).toContain('CardProps');
  });
  it('web stub when mobile-only', () => {
    const out = renderComponentWeb('Drawer', true, '@sublime-ui');
    expect(out).toContain('mobile-only');
    expect(out).toContain('return null');
  });
  it('native: Paper impl', () => {
    const out = renderComponentNative('Card', '@sublime-ui');
    expect(out).toContain('export function Card(');
  });
  it('index re-exports component + props type', () => {
    const out = renderComponentIndex('Card');
    expect(out).toContain("export { Card } from './Card.js';");
    expect(out).toContain("export type { CardProps } from './Card.types.js';");
  });
});
