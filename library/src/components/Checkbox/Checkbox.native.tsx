import { Checkbox as PaperCheckbox } from 'react-native-paper';
import { useTokens } from '../../provider/useTokens.js';
import type { ResolvedTokens } from '../../provider/TokenContext.js';
import type { Tone } from '../common.js';
import type { CheckboxProps } from './Checkbox.types.js';

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

export function Checkbox({
  checked,
  onChange,
  label,
  disabled,
  tone = 'primary',
  testID,
}: CheckboxProps) {
  const tokens = useTokens();
  const color = toneColor(tokens.color, tone);
  const status = checked ? 'checked' : 'unchecked';
  if (label === undefined) {
    return (
      <PaperCheckbox
        status={status}
        onPress={() => onChange(!checked)}
        disabled={disabled ?? false}
        color={color}
        {...(testID === undefined ? {} : { testID })}
      />
    );
  }
  return (
    <PaperCheckbox.Item
      label={label}
      status={status}
      onPress={() => onChange(!checked)}
      disabled={disabled ?? false}
      color={color}
      labelStyle={{ color: tokens.color.foreground }}
      {...(testID === undefined ? {} : { testID })}
    />
  );
}
