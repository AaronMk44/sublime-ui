import type { ReactElement } from 'react';

export interface TooltipProps {
  /** The tooltip text shown on hover/long-press. */
  label: string;
  /** The single element the tooltip wraps. */
  children: ReactElement;
  testID?: string;
}
