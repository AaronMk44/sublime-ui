import { View, Pressable } from 'react-native';
import { Surface } from 'react-native-paper';
import { useTokens } from '../../provider/useTokens.js';
import type { CardProps } from './Card.types.js';

export function Card({ children, onPress, padded = true, testID }: CardProps) {
  const tokens = useTokens();
  const surfaceStyle = {
    backgroundColor: tokens.color.glassBg,
    borderColor: tokens.color.glassBorder,
    borderWidth: 1,
    borderRadius: tokens.radii.lg,
    padding: padded ? tokens.spacing.lg : 0,
  };
  return (
    <Surface elevation={1} style={surfaceStyle} {...(testID ? { testID } : {})}>
      {onPress ? (
        <Pressable onPress={onPress}>{children}</Pressable>
      ) : (
        <View>{children}</View>
      )}
    </Surface>
  );
}
