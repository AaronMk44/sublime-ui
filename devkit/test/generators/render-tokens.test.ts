import { describe, it, expect } from 'vitest';
import { renderTokensWrapper } from '../../src/lib/generators/render-tokens.js';

describe('renderTokensWrapper', () => {
  it('imports the json and casts to SublimeTokens', () => {
    const out = renderTokensWrapper('@sublime-ui');
    expect(out).toContain("import data from './tokens.json'");
    expect(out).toContain("import type { SublimeTokens } from '@sublime-ui/library'");
    expect(out).toContain('export const tokens = data as SublimeTokens;');
  });
});
