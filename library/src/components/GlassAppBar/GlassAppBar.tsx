import { AppBar as MuiAppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import { useTokens } from '../../provider/useTokens.js';
import type { GlassAppBarProps } from './GlassAppBar.types.js';

export function GlassAppBar({ title, subtitle, onBack, actions, transparent, testID }: GlassAppBarProps) {
  const tokens = useTokens();
  return (
    <MuiAppBar
      position="static"
      elevation={0}
      data-testid={testID}
      sx={{
        backgroundColor: transparent ? 'transparent' : tokens.color.glassBg,
        backdropFilter: 'blur(12px)',
        color: tokens.color.foreground,
        borderBottom: `1px solid ${tokens.color.glassBorder}`,
        boxShadow: 'none',
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
