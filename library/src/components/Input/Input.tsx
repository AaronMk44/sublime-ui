import { TextField } from '@mui/material';
import { useTokens } from '../../provider/useTokens.js';
import type { InputProps } from './Input.types.js';

export function Input({
  value, onChangeText, label, placeholder, error,
  disabled, secureTextEntry, multiline, testID,
}: InputProps) {
  const tokens = useTokens();
  return (
    <TextField
      value={value}
      onChange={(e) => onChangeText(e.target.value)}
      {...(label !== undefined ? { label } : {})}
      {...(placeholder !== undefined ? { placeholder } : {})}
      {...(error !== undefined ? { helperText: error } : {})}
      {...(testID !== undefined ? { 'data-testid': testID } : {})}
      error={!!error}
      disabled={!!disabled}
      type={secureTextEntry ? 'password' : 'text'}
      multiline={!!multiline}
      fullWidth
      variant="outlined"
      size="small"
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: `${tokens.radii.md}px`,
          '& fieldset': { borderColor: tokens.color.surfaceBorder },
        },
      }}
    />
  );
}
