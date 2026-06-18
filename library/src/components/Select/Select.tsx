import { FormControl, InputLabel, MenuItem, Select as MuiSelect } from '@mui/material';
import { useTokens } from '../../provider/useTokens.js';
import type { SelectProps } from './Select.types.js';

export function Select({
  value, onChange, options, label, placeholder, disabled, testID,
}: SelectProps) {
  const tokens = useTokens();
  const labelId = label !== undefined ? `${label}-select-label` : undefined;
  return (
    <FormControl fullWidth size="small" disabled={!!disabled}>
      {label !== undefined ? <InputLabel id={labelId}>{label}</InputLabel> : null}
      <MuiSelect
        {...(labelId !== undefined ? { labelId } : {})}
        {...(label !== undefined ? { label } : {})}
        {...(placeholder !== undefined ? { displayEmpty: true } : {})}
        {...(testID !== undefined ? { 'data-testid': testID } : {})}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        MenuProps={{
          PaperProps: {
            sx: {
              backgroundColor: tokens.color.glassBg,
              border: `1px solid ${tokens.color.glassBorder}`,
              backdropFilter: 'blur(12px)',
              borderRadius: `${tokens.radii.md}px`,
            },
          },
        }}
        sx={{
          borderRadius: `${tokens.radii.md}px`,
          '& fieldset': { borderColor: tokens.color.surfaceBorder },
        }}
      >
        {placeholder !== undefined ? (
          <MenuItem value="" disabled>
            {placeholder}
          </MenuItem>
        ) : null}
        {options.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </MuiSelect>
    </FormControl>
  );
}
