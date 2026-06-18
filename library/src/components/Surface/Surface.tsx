import { Box } from '@mui/material';
import { useTokens } from '../../provider/useTokens.js';
import type { SurfaceProps, SurfaceElevation } from './Surface.types.js';

const boxShadow = (
  e: SurfaceElevation,
  shadows: { sm: string; md: string; lg: string },
): string => (e === 'none' ? 'none' : shadows[e]);

export function Surface({
  children,
  elevation = 'sm',
  padded = true,
  testID,
}: SurfaceProps) {
  const tokens = useTokens();
  return (
    <Box
      data-testid={testID}
      sx={{
        backgroundColor: tokens.color.surface,
        border: `1px solid ${tokens.color.surfaceBorder}`,
        borderRadius: `${tokens.radii.lg}px`,
        boxShadow: boxShadow(elevation, tokens.shadows),
        padding: padded ? `${tokens.spacing.lg}px` : 0,
      }}
    >
      {children}
    </Box>
  );
}
