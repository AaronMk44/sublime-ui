import { Avatar as PaperAvatar } from 'react-native-paper';
import { useTokens } from '../../provider/useTokens.js';
import type { Size } from '../common.js';
import type { AvatarProps } from './Avatar.types.js';

const pxFor = (size: Size): number =>
  size === 'sm' ? 28 : size === 'lg' ? 56 : 40;

const initialsOf = (label: string): string =>
  label
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

export function Avatar({ source, label, size = 'md', testID }: AvatarProps) {
  const tokens = useTokens();
  const dim = pxFor(size);
  if (source) {
    return (
      <PaperAvatar.Image
        {...(testID ? { testID } : {})}
        size={dim}
        source={{ uri: source }}
      />
    );
  }
  return (
    <PaperAvatar.Text
      {...(testID ? { testID } : {})}
      size={dim}
      label={label ? initialsOf(label) : ''}
      style={{ backgroundColor: tokens.color.primarySoftBg }}
      labelStyle={{ color: tokens.color.primarySoftFg }}
    />
  );
}
