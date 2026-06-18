import type { ReactNode } from 'react';

export type Variant = 'solid' | 'soft' | 'outline' | 'ghost';
export type Tone = 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';
export type Size = 'sm' | 'md' | 'lg';

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
