import { Icon as PaperIcon } from 'react-native-paper';
import { useTokens } from '../../provider/useTokens.js';
import type { ResolvedTokens } from '../../provider/TokenContext.js';
import type { ColorTokens } from '../../tokens/tokens.js';
import type { IconColor, IconProps } from './Icon.types.js';
import type { Size } from '../common.js';

const resolveSize = (
  t: ResolvedTokens,
  size: number | Size | undefined,
): number => {
  if (typeof size === 'number') return size;
  const key: Size = size ?? 'md';
  return t.typography.sizes[key];
};

const resolveColor = (
  c: ColorTokens,
  color: IconColor | undefined,
): string | undefined => {
  if (color === undefined) return undefined;
  if (color in c) return c[color as keyof ColorTokens];
  return color;
};

export function Icon({ name, size, color, testID }: IconProps) {
  const tokens = useTokens();
  const px = resolveSize(tokens, size);
  const resolved = resolveColor(tokens.color, color);

  return (
    <PaperIcon
      source={name}
      size={px}
      {...(resolved ? { color: resolved } : {})}
      {...(testID ? { testID } : {})}
    />
  );
}
