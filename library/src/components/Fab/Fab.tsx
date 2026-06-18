import { Fab as MuiFab } from '@mui/material';
import { useTokens } from '../../provider/useTokens.js';
import type { Tone } from '../common.js';
import type { FabProps } from './Fab.types.js';

const muiColor = (
  t: Tone,
): 'primary' | 'success' | 'error' | 'warning' | 'info' | 'inherit' =>
  t === 'danger' ? 'error' : t === 'neutral' ? 'inherit' : t;

export function Fab({ icon, onPress, tone = 'primary', label, testID }: FabProps) {
  const tokens = useTokens();
  const extended = label !== undefined;
  return (
    <MuiFab
      color={muiColor(tone)}
      variant={extended ? 'extended' : 'circular'}
      onClick={onPress}
      data-testid={testID}
      sx={{
        backgroundColor: tokens.color.surface,
        color: tokens.color.foreground,
        border: `1px solid ${tokens.color.surfaceBorder}`,
        backdropFilter: 'blur(12px)',
        textTransform: 'none',
        fontWeight: tokens.typography.weights.semibold,
        '&:hover': { backgroundColor: tokens.color.surfaceHover },
      }}
    >
      <span className="material-icons" aria-hidden {...(extended ? { style: { marginRight: tokens.spacing.sm } } : {})}>
        {icon}
      </span>
      {label}
    </MuiFab>
  );
}
