import { View } from 'react-native';
import { Switch as PaperSwitch, Text } from 'react-native-paper';
import { useTokens } from '../../provider/useTokens.js';
import type { ResolvedTokens } from '../../provider/TokenContext.js';
import type { Tone } from '../common.js';
import type { SwitchProps } from './Switch.types.js';

const toneColor = (c: ResolvedTokens['color'], tone: Tone): string => {
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
      return c.secondary;
    case 'primary':
    default:
      return c.primary;
  }
};

export function Switch({
  value,
  onValueChange,
  label,
  disabled,
  tone = 'primary',
  testID,
}: SwitchProps) {
  const tokens = useTokens();
  const color = toneColor(tokens.color, tone);
  const control = (
    <PaperSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled ?? false}
      color={color}
      {...(testID === undefined ? {} : { testID })}
    />
  );
  if (label === undefined) return control;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.spacing.sm,
      }}
    >
      {control}
      <Text style={{ color: tokens.color.foreground }}>{label}</Text>
    </View>
  );
}
