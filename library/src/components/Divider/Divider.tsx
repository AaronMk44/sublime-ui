import { Divider as MuiDivider } from '@mui/material';
import { useTokens } from '../../provider/useTokens.js';
import type { DividerProps } from './Divider.types.js';

export function Divider({ vertical, inset, testID }: DividerProps) {
  const tokens = useTokens();
  return (
    <MuiDivider
      orientation={vertical ? 'vertical' : 'horizontal'}
      flexItem={vertical === true}
      {...(inset ? { variant: 'inset' as const } : {})}
      data-testid={testID}
      sx={{ borderColor: tokens.color.divider }}
    />
  );
}
