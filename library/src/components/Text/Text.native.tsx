import { Text as PaperText } from 'react-native-paper';
import { useTokens } from '../../provider/useTokens.js';
import type { TextProps, TextVariant } from './Text.types.js';

const paperVariant = (
  v: TextVariant,
): 'titleMedium' | 'titleSmall' | 'bodyMedium' | 'bodySmall' =>
  v === 'title'
    ? 'titleMedium'
    : v === 'subtitle'
      ? 'titleSmall'
      : v === 'caption'
        ? 'bodySmall'
        : 'bodyMedium';

export function Text({
  children, variant = 'body', numberOfLines, testID,
}: TextProps) {
  const tokens = useTokens();
  const muted = variant === 'caption' || variant === 'subtitle';
  return (
    <PaperText
      variant={paperVariant(variant)}
      numberOfLines={numberOfLines}
      testID={testID}
      style={{ color: muted ? tokens.color.mutedFg : tokens.color.foreground }}
    >
      {children}
    </PaperText>
  );
}
