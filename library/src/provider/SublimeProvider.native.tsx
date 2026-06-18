import { type ReactNode, useMemo } from 'react';
import { PaperProvider } from 'react-native-paper';
import { generateThemes } from '../tokens/generateThemes.js';
import { defaultTokens, type SublimeTokens } from '../tokens/tokens.js';
import { TokenContext } from './TokenContext.js';
import { resolveTokens } from './resolveTokens.js';
import { NotificationProvider } from '../notifications/NotificationContext.js';
import { NotificationHost } from '../notifications/NotificationHost.native.js';

export interface SublimeProviderProps {
  mode?: 'light' | 'dark';
  tokens?: SublimeTokens;
  children: ReactNode;
}

export function SublimeProvider({ mode = 'light', tokens = defaultTokens, children }: SublimeProviderProps) {
  const { paperTheme } = useMemo(() => generateThemes(tokens, mode), [tokens, mode]);
  const resolved = useMemo(() => resolveTokens(tokens, mode), [tokens, mode]);
  return (
    <PaperProvider theme={paperTheme}>
      <TokenContext.Provider value={resolved}>
        <NotificationProvider>
          {children}
          <NotificationHost />
        </NotificationProvider>
      </TokenContext.Provider>
    </PaperProvider>
  );
}
