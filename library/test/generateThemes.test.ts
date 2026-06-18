import { describe, it, expect } from 'vitest';
import { generateThemes } from '../src/tokens/generateThemes.js';
import { defaultTokens } from '../src/tokens/tokens.js';

describe('generateThemes', () => {
  it('maps tokens into a Paper MD3 theme', () => {
    const { paperTheme } = generateThemes(defaultTokens, 'light');
    expect(paperTheme.colors.primary).toBe(defaultTokens.color.light.primary);
    expect(paperTheme.colors.error).toBe(defaultTokens.color.light.danger);
    expect(paperTheme.roundness).toBe(defaultTokens.radii.md);
    expect(paperTheme.dark).toBe(false);
  });
  it('maps tokens into an MUI theme', () => {
    const { muiTheme } = generateThemes(defaultTokens, 'dark');
    expect(muiTheme.palette.mode).toBe('dark');
    expect(muiTheme.palette.primary.main).toBe(defaultTokens.color.dark.primary);
    expect(muiTheme.palette.error.main).toBe(defaultTokens.color.dark.danger);
    expect(muiTheme.shape.borderRadius).toBe(defaultTokens.radii.md);
  });
  it('is pure — same input yields equal output shape', () => {
    const a = generateThemes(defaultTokens, 'light');
    const b = generateThemes(defaultTokens, 'light');
    expect(a.muiTheme.palette.primary.main).toBe(b.muiTheme.palette.primary.main);
  });
});
