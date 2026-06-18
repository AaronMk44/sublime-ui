import { Tooltip as PaperTooltip } from 'react-native-paper';
import type { TooltipProps } from './Tooltip.types.js';

export function Tooltip({ label, children }: TooltipProps) {
  return <PaperTooltip title={label}>{children}</PaperTooltip>;
}
