import { MD3LightTheme, MD3DarkTheme, type MD3Theme } from 'react-native-paper';
import { createTheme, type Theme } from '@mui/material';
import type { SublimeTokens } from './tokens.js';

export function generateThemes(
  tokens: SublimeTokens,
  mode: 'light' | 'dark',
): { paperTheme: MD3Theme; muiTheme: Theme } {
  const c = tokens.color[mode];
  const base = mode === 'dark' ? MD3DarkTheme : MD3LightTheme;

  const paperTheme: MD3Theme = {
    ...base,
    roundness: tokens.radii.md,
    colors: {
      ...base.colors,
      primary: c.primary,
      onPrimary: c.primaryFg,
      secondary: c.secondary,
      onSecondary: c.secondaryFg,
      error: c.danger,
      background: c.background,
      onBackground: c.foreground,
      surface: c.surface,
      onSurface: c.foreground,
      outline: c.surfaceBorder,
      outlineVariant: c.divider,
    },
  };

  const muiTheme = createTheme({
    palette: {
      mode,
      primary: { main: c.primary, contrastText: c.primaryFg },
      secondary: { main: c.secondary, contrastText: c.secondaryFg },
      success: { main: c.success },
      warning: { main: c.warning },
      error: { main: c.danger },
      info: { main: c.info },
      background: { default: c.background, paper: c.surface },
      text: { primary: c.foreground, secondary: c.mutedFg },
      divider: c.divider,
    },
    shape: { borderRadius: tokens.radii.md },
    typography: { fontFamily: tokens.typography.family },
  });

  return { paperTheme, muiTheme };
}
