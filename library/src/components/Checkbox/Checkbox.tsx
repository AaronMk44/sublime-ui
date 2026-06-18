import { Checkbox as MuiCheckbox, FormControlLabel } from '@mui/material';
import type { Tone } from '../common.js';
import type { CheckboxProps } from './Checkbox.types.js';

const muiColor = (
  t: Tone,
): 'primary' | 'success' | 'error' | 'warning' | 'info' | 'default' =>
  t === 'danger' ? 'error' : t === 'neutral' ? 'default' : t;

export function Checkbox({
  checked,
  onChange,
  label,
  disabled,
  tone = 'primary',
  testID,
}: CheckboxProps) {
  const control = (
    <MuiCheckbox
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
      color={muiColor(tone)}
      data-testid={testID}
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
