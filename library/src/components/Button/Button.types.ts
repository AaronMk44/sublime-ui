import type { ReactNode } from 'react';
import type { Variant, Tone, Size } from '../common.js';

export type { Variant, Tone, Size };

export interface ButtonProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: Variant;
  tone?: Tone;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  fullWidth?: boolean;
  testID?: string;
}
