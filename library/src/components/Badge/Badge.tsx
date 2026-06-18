import { Chip } from '@mui/material';
import { useTokens } from '../../provider/useTokens.js';
import type { ResolvedTokens } from '../../provider/TokenContext.js';
import type { Tone } from '../common.js';
import type { BadgeProps, BadgeVariant } from './Badge.types.js';

interface ColorPair {
  bg: string;
  fg: string;
}

const solidPair = (c: ResolvedTokens['color'], tone: Tone): ColorPair => {
  switch (tone) {
    case 'primary':
      return { bg: c.primary, fg: c.primaryFg };
    case 'success':
      return { bg: c.success, fg: c.primaryFg };
    case 'danger':
      return { bg: c.danger, fg: c.primaryFg };
    case 'warning':
      return { bg: c.warning, fg: c.primaryFg };
    case 'info':
      return { bg: c.info, fg: c.primaryFg };
    case 'neutral':
    default:
      return { bg: c.secondary, fg: c.secondaryFg };
  }
};

const softPair = (c: ResolvedTokens['color'], tone: Tone): ColorPair => {
  switch (tone) {
    case 'primary':
      return { bg: c.primarySoftBg, fg: c.primarySoftFg };
    case 'success':
      return { bg: c.successSoftBg, fg: c.successSoftFg };
    case 'danger':
      return { bg: c.dangerSoftBg, fg: c.dangerSoftFg };
    case 'warning':
      return { bg: c.warningSoftBg, fg: c.warningSoftFg };
    case 'info':
      return { bg: c.infoSoftBg, fg: c.infoSoftFg };
    case 'neutral':
    default:
      return { bg: c.surfaceHover, fg: c.mutedFg };
  }
};

const mutedPair = (c: ResolvedTokens['color']): ColorPair => ({
  bg: c.surfaceHover,
  fg: c.mutedFg,
});

const pairFor = (
  c: ResolvedTokens['color'],
  tone: Tone,
  variant: BadgeVariant,
): ColorPair => {
  if (variant === 'solid') return solidPair(c, tone);
  if (variant === 'muted') return mutedPair(c);
  return softPair(c, tone);
};

export function Badge({
  label,
  tone = 'neutral',
  variant = 'soft',
  icon,
  testID,
}: BadgeProps) {
  const tokens = useTokens();
  const { bg, fg } = pairFor(tokens.color, tone, variant);
  return (
    <Chip
      size="small"
      label={label}
      data-testid={testID}
      sx={{
        backgroundColor: bg,
        color: fg,
        borderRadius: `${tokens.radii.full}px`,
        fontWeight: tokens.typography.weights.medium,
        ...(icon ? { '& .MuiChip-icon': { color: fg } } : {}),
      }}
      {...(icon
        ? { icon: <span className="material-icons" aria-hidden>{icon}</span> }
        : {})}
    />
  );
}
