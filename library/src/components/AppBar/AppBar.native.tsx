import { StatusBar } from 'react-native';
import { Appbar } from 'react-native-paper';
import { useTokens } from '../../provider/useTokens.js';
import type { AppBarProps } from './AppBar.types.js';

export function AppBar({ title, subtitle, onBack, actions, testID }: AppBarProps) {
  const tokens = useTokens();
  return (
    <>
      {/* Tint the OS status bar to match the bar so the notification area is not
          a bare white strip above the header; icon contrast follows the theme. */}
      <StatusBar
        backgroundColor={tokens.color.surface}
        barStyle={tokens.mode === 'dark' ? 'light-content' : 'dark-content'}
      />
      <Appbar.Header
        testID={testID}
        style={{
          backgroundColor: tokens.color.surface,
          borderBottomColor: tokens.color.surfaceBorder,
          borderBottomWidth: 1,
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
    </>
  );
}
