import { View } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { useTokens } from '../../provider/useTokens.js';
import type { ResolvedTokens } from '../../provider/TokenContext.js';
import type { Tone } from '../common.js';
import type { BannerProps } from './Banner.types.js';

interface ColorPair {
  bg: string;
  fg: string;
}

const softPair = (c: ResolvedTokens['color'], tone: Tone): ColorPair => {
  switch (tone) {
    case 'success':
      return { bg: c.successSoftBg, fg: c.successSoftFg };
    case 'danger':
      return { bg: c.dangerSoftBg, fg: c.dangerSoftFg };
    case 'warning':
      return { bg: c.warningSoftBg, fg: c.warningSoftFg };
    case 'info':
      return { bg: c.infoSoftBg, fg: c.infoSoftFg };
    case 'primary':
    case 'neutral':
    default:
      return { bg: c.primarySoftBg, fg: c.primarySoftFg };
  }
};

export function Banner({
  tone = 'info',
  title,
  children,
  onClose,
  action,
  testID,
}: BannerProps) {
  const tokens = useTokens();
  const { bg, fg } = softPair(tokens.color, tone);
  return (
    <View
      {...(testID ? { testID } : {})}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: bg,
        borderColor: tokens.color.glassBorder,
        borderWidth: 1,
        borderRadius: tokens.radii.md,
        paddingHorizontal: tokens.spacing.md,
        paddingVertical: tokens.spacing.sm,
      }}
    >
      <View style={{ flex: 1 }}>
        {title ? (
          <Text
            style={{
              color: fg,
              fontSize: tokens.typography.sizes.md,
              fontWeight: String(tokens.typography.weights.semibold) as '600',
              marginBottom: tokens.spacing.xs,
            }}
          >
            {title}
          </Text>
        ) : null}
        {typeof children === 'string' ? (
          <Text style={{ color: fg, fontSize: tokens.typography.sizes.sm }}>
            {children}
          </Text>
        ) : (
          children
        )}
        {action ? (
          <View style={{ marginTop: tokens.spacing.sm }}>{action}</View>
        ) : null}
      </View>
      {onClose ? (
        <IconButton
          icon="close"
          size={tokens.typography.sizes.md}
          iconColor={fg}
          onPress={onClose}
          accessibilityLabel="close"
        />
      ) : null}
    </View>
  );
}
