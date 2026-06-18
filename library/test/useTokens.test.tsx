import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderHook } from '@testing-library/react';
import { TokenContext } from '../src/provider/TokenContext.js';
import { useTokens } from '../src/provider/useTokens.js';
import { defaultTokens } from '../src/tokens/tokens.js';

const resolved = {
  color: defaultTokens.color.light, radii: defaultTokens.radii, shadows: defaultTokens.shadows,
  spacing: defaultTokens.spacing, typography: defaultTokens.typography, mode: 'light' as const,
};

describe('useTokens', () => {
  it('returns the active resolved tokens from context', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(TokenContext.Provider, { value: resolved, children });
    const { result } = renderHook(() => useTokens(), { wrapper });
    expect(result.current.color.primary).toBe(defaultTokens.color.light.primary);
    expect(result.current.mode).toBe('light');
  });
  it('throws when used without a provider', () => {
    expect(() => renderHook(() => useTokens())).toThrow(/SublimeProvider/);
  });
});
