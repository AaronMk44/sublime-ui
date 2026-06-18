import { Switch as MuiSwitch, FormControlLabel } from '@mui/material';
import type { Tone } from '../common.js';
import type { SwitchProps } from './Switch.types.js';

const muiColor = (
  t: Tone,
): 'primary' | 'success' | 'error' | 'warning' | 'info' | 'default' =>
  t === 'danger' ? 'error' : t === 'neutral' ? 'default' : t;

export function Switch({
  value,
  onValueChange,
  label,
  disabled,
  tone = 'primary',
  testID,
}: SwitchProps) {
  const control = (
    <MuiSwitch
      checked={value}
      onChange={(e) => onValueChange(e.target.checked)}
      color={muiColor(tone)}
      data-testid={testID}
      {...(disabled === undefined ? {} : { disabled })}
    />
  );
  if (label === undefined) return control;
  return (
    <FormControlLabel
      control={control}
      label={label}
      {...(disabled === undefined ? {} : { disabled })}
    />
  );
}
