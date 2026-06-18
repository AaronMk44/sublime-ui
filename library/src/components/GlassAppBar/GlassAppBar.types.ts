import type { ReactNode } from 'react';

export interface GlassAppBarProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: ReactNode;
  transparent?: boolean;
  testID?: string;
}
