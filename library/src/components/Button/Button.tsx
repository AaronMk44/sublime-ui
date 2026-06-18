import { Button as MuiButton, CircularProgress } from '@mui/material';
import { useTokens } from '../../provider/useTokens.js';
import type { ButtonProps, Variant, Tone } from './Button.types.js';

const muiVariant = (v: Variant): 'contained' | 'outlined' | 'text' =>
  v === 'solid' ? 'contained' : v === 'outline' ? 'outlined' : 'text';

const muiColor = (t: Tone): 'primary' | 'success' | 'error' | 'warning' | 'info' | 'inherit' =>
  t === 'danger' ? 'error' : t === 'neutral' ? 'inherit' : t;

export function Button({
  children, onPress, variant = 'solid', tone = 'primary', size = 'md',
  disabled, loading, fullWidth, testID,
}: ButtonProps) {
  const tokens = useTokens();
  const soft = variant === 'soft';
  return (
    <MuiButton
      variant={muiVariant(variant)}
      color={muiColor(tone)}
      size={size === 'md' ? 'medium' : size === 'sm' ? 'small' : 'large'}
      disabled={Boolean(disabled || loading)}
      fullWidth={Boolean(fullWidth)}
      onClick={onPress}
      data-testid={testID}
      sx={{
        borderRadius: `${tokens.radii.md}px`,
        textTransform: 'none',
        fontWeight: tokens.typography.weights.semibold,
        ...(soft ? { backgroundColor: tokens.color.primarySoftBg, color: tokens.color.primarySoftFg, '&:hover': { backgroundColor: tokens.color.primarySoftBg } } : {}),
      }}
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
    >
      {children}
    </MuiButton>
  );
}
