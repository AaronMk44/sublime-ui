import { View, ScrollView, Pressable } from 'react-native';
import { Surface, Text, Icon } from 'react-native-paper';
import { useTokens } from '../../provider/useTokens.js';
import type { NavItem } from '../common.js';
import type { DrawerProps } from './Drawer.types.js';

function DrawerBadge({ value, fg, bg }: { value: string | number; fg: string; bg: string }) {
  return (
    <View
      style={{
        minWidth: 18,
        height: 18,
        paddingHorizontal: 5,
        borderRadius: 9,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: fg, fontSize: 10, fontWeight: '600' as '600' }}>{String(value)}</Text>
    </View>
  );
}

export function Drawer({ items, activeKey, onSelect, header, footer, testID }: DrawerProps) {
  const tokens = useTokens();
  return (
    <Surface
      elevation={1}
      {...(testID ? { testID } : {})}
      style={{
        flex: 1,
        backgroundColor: tokens.color.glassBg,
        borderRightColor: tokens.color.glassBorder,
        borderRightWidth: 1,
      }}
    >
      {header != null ? (
        <View
          style={{
            padding: tokens.spacing.lg,
            borderBottomColor: tokens.color.divider,
            borderBottomWidth: 1,
          }}
        >
          {header}
        </View>
      ) : null}
      <ScrollView
        contentContainerStyle={{
          paddingVertical: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.sm,
        }}
      >
        {items.map((item: NavItem) => {
          const active = item.key === activeKey;
          const fg = active ? tokens.color.primarySoftFg : tokens.color.foreground;
          return (
            <Pressable
              key={item.key}
              onPress={() => onSelect(item.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              testID={`${testID ?? 'drawer'}-${item.key}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: tokens.spacing.sm,
                paddingHorizontal: tokens.spacing.md,
                marginVertical: tokens.spacing.xs / 2,
                borderRadius: tokens.radii.md,
                backgroundColor: active ? tokens.color.primarySoftBg : 'transparent',
              }}
            >
              <Icon source={item.icon} size={tokens.typography.sizes.lg} color={fg} />
              <Text
                style={{
                  flex: 1,
                  marginLeft: tokens.spacing.md,
                  color: fg,
                  fontSize: tokens.typography.sizes.md,
                  fontWeight: String(
                    active ? tokens.typography.weights.semibold : tokens.typography.weights.medium,
                  ) as '600',
                }}
              >
                {item.label}
              </Text>
              {item.badge != null ? (
                <DrawerBadge
                  value={item.badge}
                  bg={tokens.color.danger}
                  fg={tokens.color.primaryFg}
                />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
      {footer != null ? (
        <View
          style={{
            padding: tokens.spacing.lg,
            borderTopColor: tokens.color.divider,
            borderTopWidth: 1,
          }}
        >
          {footer}
        </View>
      ) : null}
    </Surface>
  );
}
