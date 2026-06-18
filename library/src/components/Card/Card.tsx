import { Card as MuiCard, CardActionArea } from '@mui/material';
import { useTokens } from '../../provider/useTokens.js';
import type { CardProps } from './Card.types.js';

export function Card({ children, onPress, padded = true, testID }: CardProps) {
  const tokens = useTokens();
  const pad = padded ? `${tokens.spacing.lg}px` : 0;
  const body = onPress ? (
    <CardActionArea onClick={onPress} sx={{ p: pad }}>
      {children}
    </CardActionArea>
  ) : (
    children
  );
  return (
    <MuiCard
      elevation={0}
      data-testid={testID}
      sx={{
        backgroundColor: tokens.color.glassBg,
        border: `1px solid ${tokens.color.glassBorder}`,
        borderRadius: `${tokens.radii.lg}px`,
        boxShadow: tokens.shadows.sm,
        ...(onPress ? {} : { p: pad }),
      }}
    >
      {body}
    </MuiCard>
  );
}
