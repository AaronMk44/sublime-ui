import type { ReactNode } from 'react';

export type FlexAlign = 'start' | 'center' | 'end' | 'stretch';
export type FlexJustify =
  | 'start'
  | 'center'
  | 'end'
  | 'between'
  | 'around'
  | 'evenly';

export interface FlexProps {
  children: ReactNode;
  gap?: number;
  align?: FlexAlign;
  justify?: FlexJustify;
  testID?: string;
}

export interface RowProps extends FlexProps {
  wrap?: boolean;
}

export interface SpacerProps {
  size?: number;
}
