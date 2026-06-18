export type Variant = 'solid' | 'soft' | 'outline' | 'ghost';
export type Tone = 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';
export type Size = 'sm' | 'md' | 'lg';

export interface NavItem {
  key: string;
  label: string;
  icon: string;
  badge?: string | number;
}
