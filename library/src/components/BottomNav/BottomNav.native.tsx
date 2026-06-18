import { View, Pressable } from 'react-native';
import { Surface, Text, Icon } from 'react-native-paper';
import { useTokens } from '../../provider/useTokens.js';
import type { NavItem } from '../common.js';
import type { BottomNavProps } from './BottomNav.types.js';

function NavBadge({ value, fg, bg }: { value: string | number; fg: string; bg: string }) {
  return (
    <View
      style={{
        position: 'absolute',
        top: -4,
        right: -10,
        minWidth: 16,
        height: 16,
        paddingHorizontal: 4,
        borderRadius: 8,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: fg, fontSize: 10, fontWeight: '600' as '600' }}>{String(value)}</Text>
    </View>
  );
}

export function BottomNav({ items, activeKey, onSelect, testID }: BottomNavProps) {
  const tokens = useTokens();
  return (
    <Surface
      elevation={2}
      {...(testID ? { testID } : {})}
      style={{
        flexDirection: 'row',
        backgroundColor: tokens.color.glassBg,
        borderTopColor: tokens.color.glassBorder,
        borderTopWidth: 1,
        paddingVertical: tokens.spacing.xs,
      }}
    >
      {items.map((item: NavItem) => {
        const active = item.key === activeKey;
        const fg = active ? tokens.color.primarySoftFg : tokens.color.mutedFg;
        return (
          <Pressable
            key={item.key}
            onPress={() => onSelect(item.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            testID={`${testID ?? 'bottomnav'}-${item.key}`}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: tokens.spacing.sm,
              borderRadius: tokens.radii.md,
              backgroundColor: active ? tokens.color.primarySoftBg : 'transparent',
            }}
          >
            <View>
              <Icon source={item.icon} size={tokens.typography.sizes.lg} color={fg} />
              {item.badge != null ? (
                <NavBadge
                  value={item.badge}
                  bg={tokens.color.danger}
                  fg={tokens.color.primaryFg}
                />
              ) : null}
            </View>
            <Text
              style={{
                color: fg,
                fontSize: tokens.typography.sizes.xs,
                fontWeight: String(
                  active ? tokens.typography.weights.semibold : tokens.typography.weights.medium,
                ) as '600',
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </Surface>
  );
}
