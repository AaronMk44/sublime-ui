import { describe, it, expect } from 'vitest';
import { defaultTokens, type ColorTokens } from '../src/tokens/tokens.js';

const colorKeys: (keyof ColorTokens)[] = [
  'primary', 'primaryFg', 'secondary', 'secondaryFg',
  'success', 'warning', 'danger', 'info',
  'background', 'foreground', 'mutedFg',
  'surface', 'surfaceBorder', 'surfaceHover', 'glassBg', 'glassBorder', 'divider', 'ring',
  'primarySoftBg', 'primarySoftFg', 'successSoftBg', 'successSoftFg',
  'warningSoftBg', 'warningSoftFg', 'dangerSoftBg', 'dangerSoftFg', 'infoSoftBg', 'infoSoftFg',
];

describe('defaultTokens', () => {
  it('defines complete light and dark color sets', () => {
    for (const mode of ['light', 'dark'] as const) {
      for (const key of colorKeys) {
        expect(typeof defaultTokens.color[mode][key], `${mode}.${key}`).toBe('string');
      }
    }
  });
  it('has radii, shadows, spacing, typography scales', () => {
    expect(defaultTokens.radii.md).toBeTypeOf('number');
    expect(defaultTokens.shadows.sm).toBeTypeOf('string');
    expect(defaultTokens.spacing.md).toBeTypeOf('number');
    expect(defaultTokens.typography.sizes.md).toBeTypeOf('number');
    expect(defaultTokens.typography.weights.semibold).toBeTypeOf('number');
  });
  it('is JSON-serializable (no functions)', () => {
    expect(() => JSON.stringify(defaultTokens)).not.toThrow();
    expect(JSON.parse(JSON.stringify(defaultTokens)).color.light.primary).toBe(
      defaultTokens.color.light.primary,
    );
  });
});
