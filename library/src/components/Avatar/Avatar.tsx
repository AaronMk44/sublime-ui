import { Avatar as MuiAvatar } from '@mui/material';
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
  const initials = label ? initialsOf(label) : '';
  return (
    <MuiAvatar
      data-testid={testID}
      {...(source ? { src: source } : {})}
      {...(label ? { alt: label } : {})}
      sx={{
        width: dim,
        height: dim,
        backgroundColor: tokens.color.primarySoftBg,
        color: tokens.color.primarySoftFg,
        fontWeight: tokens.typography.weights.semibold,
        fontSize: dim * 0.4,
      }}
    >
      {source ? null : initials}
    </MuiAvatar>
  );
}
