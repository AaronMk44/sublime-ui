import { Surface as PaperSurface } from 'react-native-paper';
import { useTokens } from '../../provider/useTokens.js';
import type { SurfaceProps, SurfaceElevation } from './Surface.types.js';

type PaperElevation = 0 | 1 | 2 | 3 | 4 | 5;

const paperElevation = (e: SurfaceElevation): PaperElevation =>
  e === 'none' ? 0 : e === 'sm' ? 1 : e === 'md' ? 2 : 4;

export function Surface({
  children,
  elevation = 'sm',
  padded = true,
  testID,
}: SurfaceProps) {
  const tokens = useTokens();
  return (
    <PaperSurface
      elevation={paperElevation(elevation)}
      style={{
        backgroundColor: tokens.color.surface,
        borderColor: tokens.color.surfaceBorder,
        borderWidth: 1,
        borderRadius: tokens.radii.lg,
        padding: padded ? tokens.spacing.lg : 0,
      }}
      {...(testID ? { testID } : {})}
    >
      {children}
    </PaperSurface>
  );
}
