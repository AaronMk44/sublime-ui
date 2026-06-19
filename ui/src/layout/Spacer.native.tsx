import { View } from 'react-native';
import type { ViewStyle } from 'react-native';
import type { SpacerProps } from './Stack.types';

export function Spacer({ size }: SpacerProps) {
  const style: ViewStyle = {
    flex: size === undefined ? 1 : undefined,
    height: size,
    width: size,
  };
  return <View style={style} />;
}
