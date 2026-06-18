import { type ReactNode, useMemo } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { generateThemes } from '../tokens/generateThemes.js';
import { defaultTokens, type SublimeTokens } from '../tokens/tokens.js';
import { TokenContext } from './TokenContext.js';
import { resolveTokens } from './resolveTokens.js';
import { NotificationProvider } from '../notifications/NotificationContext.js';
import { NotificationHost } from '../notifications/NotificationHost.js';

export interface SublimeProviderProps {
  mode?: 'light' | 'dark';
  tokens?: SublimeTokens;
  children: ReactNode;
}

export function SublimeProvider({ mode = 'light', tokens = defaultTokens, children }: SublimeProviderProps) {
  const { muiTheme } = useMemo(() => generateThemes(tokens, mode), [tokens, mode]);
  const resolved = useMemo(() => resolveTokens(tokens, mode), [tokens, mode]);
  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <TokenContext.Provider value={resolved}>
        <NotificationProvider>
          {children}
          <NotificationHost />
        </NotificationProvider>
      </TokenContext.Provider>
    </ThemeProvider>
  );
}
