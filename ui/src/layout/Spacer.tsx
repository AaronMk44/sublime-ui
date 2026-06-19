import type { CSSProperties } from 'react';
import type { SpacerProps } from './Stack.types';

export function Spacer({ size }: SpacerProps) {
  const style: CSSProperties = {
    flex: size === undefined ? 1 : undefined,
    height: size,
    width: size,
  };
  return <div style={style} />;
}
