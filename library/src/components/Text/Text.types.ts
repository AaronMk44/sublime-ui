import type { ReactNode } from 'react';
import type { Tone } from '../common.js';

export type TextVariant = 'title' | 'subtitle' | 'body' | 'caption';

export interface TextProps {
  children: ReactNode;
  variant?: TextVariant;
  tone?: Tone;
  numberOfLines?: number;
  testID?: string;
}
