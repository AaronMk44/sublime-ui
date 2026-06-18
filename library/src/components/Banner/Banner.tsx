import { Alert, AlertTitle } from '@mui/material';
import type { AlertColor } from '@mui/material';
import { useTokens } from '../../provider/useTokens.js';
import type { ResolvedTokens } from '../../provider/TokenContext.js';
import type { Tone } from '../common.js';
import type { BannerProps } from './Banner.types.js';

const severityFor = (tone: Tone): AlertColor => {
  switch (tone) {
    case 'success':
      return 'success';
    case 'danger':
      return 'error';
    case 'warning':
      return 'warning';
    case 'primary':
    case 'info':
    case 'neutral':
    default:
      return 'info';
  }
};

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
    <Alert
      severity={severityFor(tone)}
      data-testid={testID}
      {...(onClose ? { onClose } : {})}
      {...(action ? { action } : {})}
      sx={{
        backgroundColor: bg,
        color: fg,
        borderRadius: `${tokens.radii.md}px`,
        '& .MuiAlert-icon': { color: fg },
        '& .MuiAlert-action': { color: fg },
      }}
    >
      {title ? (
        <AlertTitle sx={{ fontWeight: tokens.typography.weights.semibold }}>
          {title}
        </AlertTitle>
      ) : null}
      {children}
    </Alert>
  );
}
