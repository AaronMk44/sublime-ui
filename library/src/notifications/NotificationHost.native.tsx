import { Snackbar } from 'react-native-paper';
import { useNotificationQueue } from './NotificationContext.js';

export function NotificationHost() {
  const { queue, dismiss } = useNotificationQueue();
  const current = queue[0];
  if (!current) return null;
  return (
    <Snackbar
      visible
      onDismiss={() => dismiss(current.id)}
      duration={current.duration}
      {...(current.action
        ? { action: { label: current.action.label, onPress: current.action.onPress } }
        : {})}
    >
      {current.message}
    </Snackbar>
  );
}
