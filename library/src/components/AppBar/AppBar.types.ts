import type { ReactNode } from 'react';

export interface AppBarProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: ReactNode;
  testID?: string;
}
