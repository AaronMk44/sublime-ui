import type { Tone } from '../common.js';

export type BadgeVariant = 'solid' | 'soft' | 'muted';

export interface BadgeProps {
  label: string;
  tone?: Tone;
  variant?: BadgeVariant;
  icon?: string;
  testID?: string;
}
