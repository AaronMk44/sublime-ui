import { Snackbar, Alert } from '@mui/material';
import { useNotificationQueue, type Tone } from './NotificationContext.js';

const severityOf = (tone: Tone): 'success' | 'error' | 'warning' | 'info' =>
  tone === 'neutral' ? 'info' : tone;

export function NotificationHost() {
  const { queue, dismiss } = useNotificationQueue();
  return (
    <>
      {queue.map((n, i) => (
        <Snackbar
          key={n.id}
          open
          autoHideDuration={n.duration}
          onClose={() => dismiss(n.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          style={{ bottom: 16 + i * 64 }}
        >
          <Alert severity={severityOf(n.tone)} onClose={() => dismiss(n.id)} variant="filled">
            {n.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  );
}
