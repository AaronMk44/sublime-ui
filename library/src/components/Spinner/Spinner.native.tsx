import { ActivityIndicator } from 'react-native-paper';
import { useTokens } from '../../provider/useTokens.js';
import type { ResolvedTokens } from '../../provider/TokenContext.js';
import type { Tone, Size } from '../common.js';
import type { SpinnerProps } from './Spinner.types.js';

const paperSize = (size: Size): 'small' | 'large' =>
  size === 'lg' ? 'large' : 'small';

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
    <ActivityIndicator
      animating
      size={paperSize(size)}
      color={toneColor(tokens.color, tone)}
      {...(testID ? { testID } : {})}
    />
  );
}
