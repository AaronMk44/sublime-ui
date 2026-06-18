import { Portal, Dialog as PaperDialog, Text } from 'react-native-paper';
import { useTokens } from '../../provider/useTokens.js';
import type { DialogProps } from './Dialog.types.js';

export function Dialog({ open, onClose, title, children, actions, testID }: DialogProps) {
  const tokens = useTokens();
  return (
    <Portal>
      <PaperDialog
        visible={open}
        onDismiss={onClose}
        style={{
          backgroundColor: tokens.color.glassBg,
          borderColor: tokens.color.glassBorder,
          borderWidth: 1,
          borderRadius: tokens.radii.lg,
        }}
        {...(testID ? { testID } : {})}
      >
        {title ? <PaperDialog.Title>{title}</PaperDialog.Title> : null}
        <PaperDialog.Content>
          {typeof children === 'string' ? <Text>{children}</Text> : children}
        </PaperDialog.Content>
        {actions ? <PaperDialog.Actions>{actions}</PaperDialog.Actions> : null}
      </PaperDialog>
    </Portal>
  );
}
