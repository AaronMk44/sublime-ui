import type { ReactNode } from 'react';

export type SurfaceElevation = 'none' | 'sm' | 'md' | 'lg';

export interface SurfaceProps {
  children: ReactNode;
  elevation?: SurfaceElevation;
  padded?: boolean;
  testID?: string;
}
