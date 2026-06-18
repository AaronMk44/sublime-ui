import type { ReactNode } from 'react';
import type { Tone } from '../common.js';

export interface BannerProps {
  tone?: Tone;
  title?: string;
  children: ReactNode;
  onClose?: () => void;
  action?: ReactNode;
  testID?: string;
}
