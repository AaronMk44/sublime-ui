import type { ReactNode } from 'react';

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  testID?: string;
}
