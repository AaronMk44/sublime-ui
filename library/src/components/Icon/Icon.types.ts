import type { ReactNode } from 'react';
import type { Size } from '../common.js';
import type { ColorTokens } from '../../tokens/tokens.js';

export type IconColor = keyof ColorTokens | (string & {});

export interface IconProps {
  name: string;
  node?: ReactNode;
  size?: number | Size;
  color?: IconColor;
  testID?: string;
}
