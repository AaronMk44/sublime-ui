import { Tooltip as MuiTooltip } from '@mui/material';
import type { TooltipProps } from './Tooltip.types.js';

export function Tooltip({ label, children, testID }: TooltipProps) {
  return (
    <MuiTooltip title={label} data-testid={testID}>
      {children}
    </MuiTooltip>
  );
}
