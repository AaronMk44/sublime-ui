import { Button as PaperButton } from 'react-native-paper';
import { useTokens } from '../../provider/useTokens.js';
import type { ButtonProps, Variant } from './Button.types.js';

const paperMode = (v: Variant): 'contained' | 'outlined' | 'text' | 'contained-tonal' =>
  v === 'solid' ? 'contained' : v === 'soft' ? 'contained-tonal' : v === 'outline' ? 'outlined' : 'text';

export function Button({
  children, onPress, variant = 'solid', size = 'md',
  disabled, loading, icon, testID,
}: ButtonProps) {
  const tokens = useTokens();
  return (
    <PaperButton
      mode={paperMode(variant)}
      onPress={onPress ?? (() => {})}
      disabled={Boolean(disabled || loading)}
      loading={Boolean(loading)}
      compact={size === 'sm'}
      style={{ borderRadius: tokens.radii.md }}
      {...(icon !== undefined ? { icon } : {})}
      {...(testID !== undefined ? { testID } : {})}
    >
      {children}
    </PaperButton>
  );
}
