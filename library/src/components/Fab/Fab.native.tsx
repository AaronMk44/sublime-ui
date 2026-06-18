import { FAB } from 'react-native-paper';
import { useTokens } from '../../provider/useTokens.js';
import type { Tone } from '../common.js';
import type { FabProps } from './Fab.types.js';

const paperColor = (c: ReturnType<typeof useTokens>['color'], tone: Tone): string => {
  switch (tone) {
    case 'success':
      return c.success;
    case 'danger':
      return c.danger;
    case 'warning':
      return c.warning;
    case 'info':
      return c.info;
    case 'neutral':
      return c.foreground;
    case 'primary':
    default:
      return c.primary;
  }
};

export function Fab({ icon, onPress, tone = 'primary', label, testID }: FabProps) {
  const tokens = useTokens();
  return (
    <FAB
      icon={icon}
      color={paperColor(tokens.color, tone)}
      onPress={onPress ?? (() => {})}
      style={{
        backgroundColor: tokens.color.surface,
        borderColor: tokens.color.surfaceBorder,
        borderWidth: 1,
        borderRadius: tokens.radii.full,
      }}
      {...(label !== undefined ? { label } : {})}
      {...(testID !== undefined ? { testID } : {})}
    />
  );
}
