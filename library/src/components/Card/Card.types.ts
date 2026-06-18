import type { ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  padded?: boolean;
  testID?: string;
}
