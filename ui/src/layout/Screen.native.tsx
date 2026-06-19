import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View } from 'react-native';
import type { ScreenProps } from './Screen.types';

export function Screen({ children, scroll, padded = true, testID }: ScreenProps) {
  const inner = <View style={{ padding: padded ? 16 : 0, flex: 1 }}>{children}</View>;
  return (
    <SafeAreaView style={{ flex: 1 }} testID={testID}>
      {scroll ? <ScrollView>{inner}</ScrollView> : inner}
    </SafeAreaView>
  );
}
