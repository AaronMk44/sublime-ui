import {
  Dialog as MuiDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import { useTokens } from '../../provider/useTokens.js';
import type { DialogProps } from './Dialog.types.js';

export function Dialog({ open, onClose, title, children, actions, testID }: DialogProps) {
  const tokens = useTokens();
  return (
    <MuiDialog
      open={open}
      onClose={onClose}
      data-testid={testID}
      PaperProps={{
        sx: {
          backgroundColor: tokens.color.glassBg,
          border: `1px solid ${tokens.color.glassBorder}`,
          borderRadius: `${tokens.radii.lg}px`,
          backgroundImage: 'none',
        },
      }}
    >
      {title ? (
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: tokens.typography.weights.semibold,
            color: tokens.color.foreground,
          }}
        >
          {title}
          <IconButton aria-label="close" onClick={onClose} size="small" edge="end">
            <span className="material-icons" aria-hidden>
              close
            </span>
          </IconButton>
        </DialogTitle>
      ) : null}
      <DialogContent sx={{ color: tokens.color.foreground }}>{children}</DialogContent>
      {actions ? <DialogActions>{actions}</DialogActions> : null}
    </MuiDialog>
  );
}
