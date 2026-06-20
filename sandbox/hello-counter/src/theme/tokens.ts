import tokensJson from './tokens.json' with { type: 'json' };
import type { SublimeTokens } from '@sublime-ui/library';

/** Typed app design tokens. Edit tokens.json; this stays a thin typed wrapper. */
export const tokens = tokensJson as unknown as SublimeTokens;
