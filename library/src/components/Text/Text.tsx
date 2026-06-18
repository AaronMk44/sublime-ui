import { Typography } from '@mui/material';
import { useTokens } from '../../provider/useTokens.js';
import type { TextProps, TextVariant } from './Text.types.js';

const muiVariant = (v: TextVariant): 'h6' | 'subtitle1' | 'body1' | 'caption' =>
  v === 'title' ? 'h6' : v === 'subtitle' ? 'subtitle1' : v === 'caption' ? 'caption' : 'body1';

export function Text({
  children, variant = 'body', numberOfLines, testID,
}: TextProps) {
  const tokens = useTokens();
  const muted = variant === 'caption' || variant === 'subtitle';
  const clamp =
    numberOfLines !== undefined
      ? {
          display: '-webkit-box',
          WebkitLineClamp: numberOfLines,
          WebkitBoxOrient: 'vertical' as const,
          overflow: 'hidden',
        }
      : {};
  return (
    <Typography
      variant={muiVariant(variant)}
      data-testid={testID}
      sx={{
        color: muted ? tokens.color.mutedFg : tokens.color.foreground,
        ...clamp,
      }}
    >
      {children}
    </Typography>
  );
}
