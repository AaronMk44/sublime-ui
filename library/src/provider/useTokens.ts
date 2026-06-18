import { useContext } from 'react';
import { TokenContext, type ResolvedTokens } from './TokenContext.js';

export function useTokens(): ResolvedTokens {
  const tokens = useContext(TokenContext);
  if (tokens === null) {
    throw new Error('useTokens must be used within a <SublimeProvider>.');
  }
  return tokens;
}
