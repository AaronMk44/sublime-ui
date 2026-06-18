import { Appbar } from 'react-native-paper';
import { useTokens } from '../../provider/useTokens.js';
import type { GlassAppBarProps } from './GlassAppBar.types.js';

export function GlassAppBar({ title, subtitle, onBack, actions, transparent, testID }: GlassAppBarProps) {
  const tokens = useTokens();
  return (
    <Appbar.Header
      testID={testID}
      style={{
        backgroundColor: transparent ? 'transparent' : tokens.color.glassBg,
        borderBottomColor: tokens.color.glassBorder,
        borderBottomWidth: 1,
        elevation: 0,
      }}
    >
      {onBack ? <Appbar.BackAction onPress={onBack} accessibilityLabel="back" /> : null}
      <Appbar.Content
        title={title}
        {...(subtitle ? { subtitle } : {})}
        titleStyle={{
          color: tokens.color.foreground,
          fontWeight: String(tokens.typography.weights.semibold) as '600',
        }}
      />
      {actions ?? null}
    </Appbar.Header>
  );
}
