import type { SublimeTokens } from '../tokens/tokens.js';
import type { ResolvedTokens } from './TokenContext.js';

export function resolveTokens(
  tokens: SublimeTokens,
  mode: 'light' | 'dark',
): ResolvedTokens {
  return {
    color: tokens.color[mode],
    radii: tokens.radii,
    shadows: tokens.shadows,
    spacing: tokens.spacing,
    typography: tokens.typography,
    mode,
  };
}
