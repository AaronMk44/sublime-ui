import { AppBar as MuiAppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import { useTokens } from '../../provider/useTokens.js';
import type { AppBarProps } from './AppBar.types.js';

export function AppBar({ title, subtitle, onBack, actions, testID }: AppBarProps) {
  const tokens = useTokens();
  return (
    <MuiAppBar
      position="static"
      elevation={0}
      data-testid={testID}
      sx={{
        backgroundColor: tokens.color.surface,
        color: tokens.color.foreground,
        borderBottom: `1px solid ${tokens.color.surfaceBorder}`,
      }}
    >
      <Toolbar sx={{ gap: `${tokens.spacing.sm}px` }}>
        {onBack ? (
          <IconButton
            edge="start"
            aria-label="back"
            onClick={onBack}
            sx={{ color: tokens.color.foreground }}
          >
            <span aria-hidden>{'←'}</span>
          </IconButton>
        ) : null}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="h6"
            noWrap
            sx={{ fontWeight: tokens.typography.weights.semibold }}
          >
            {title}
          </Typography>
          {subtitle ? (
            <Typography
              variant="caption"
              noWrap
              sx={{ display: 'block', color: tokens.color.mutedFg }}
            >
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {actions ?? null}
      </Toolbar>
    </MuiAppBar>
  );
}
