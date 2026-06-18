import { View } from 'react-native';
import { Divider as PaperDivider } from 'react-native-paper';
import { useTokens } from '../../provider/useTokens.js';
import type { DividerProps } from './Divider.types.js';

export function Divider({ vertical, inset, testID }: DividerProps) {
  const tokens = useTokens();
  if (vertical) {
    return (
      <View
        accessibilityRole="none"
        style={{
          alignSelf: 'stretch',
          width: 1,
          backgroundColor: tokens.color.divider,
        }}
        {...(testID ? { testID } : {})}
      />
    );
  }
  return (
    <PaperDivider
      style={{
        backgroundColor: tokens.color.divider,
        marginLeft: inset ? tokens.spacing.lg : 0,
      }}
      {...(testID ? { testID } : {})}
    />
  );
}
