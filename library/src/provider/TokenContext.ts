import { createContext } from 'react';
import type { ColorTokens, SublimeTokens } from '../tokens/tokens.js';

export interface ResolvedTokens {
  color: ColorTokens;
  radii: SublimeTokens['radii'];
  shadows: SublimeTokens['shadows'];
  spacing: SublimeTokens['spacing'];
  typography: SublimeTokens['typography'];
  mode: 'light' | 'dark';
}

export const TokenContext = createContext<ResolvedTokens | null>(null);
