import { CircularProgress } from '@mui/material';
import { useTokens } from '../../provider/useTokens.js';
import type { ResolvedTokens } from '../../provider/TokenContext.js';
import type { Tone, Size } from '../common.js';
import type { SpinnerProps } from './Spinner.types.js';

const sizePx = (size: Size): number =>
  size === 'sm' ? 16 : size === 'lg' ? 40 : 24;

const toneColor = (c: ResolvedTokens['color'], tone: Tone): string => {
  switch (tone) {
    case 'primary':
      return c.primary;
    case 'success':
      return c.success;
    case 'danger':
      return c.danger;
    case 'warning':
      return c.warning;
    case 'info':
      return c.info;
    case 'neutral':
    default:
      return c.mutedFg;
  }
};

export function Spinner({ size = 'md', tone = 'primary', testID }: SpinnerProps) {
  const tokens = useTokens();
  return (
    <CircularProgress
      size={sizePx(size)}
      data-testid={testID}
      sx={{ color: toneColor(tokens.color, tone) }}
    />
  );
}
