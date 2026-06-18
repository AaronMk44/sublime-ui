import { useMemo } from 'react';
import { useNotificationQueue, type NotifyOptions, type Tone } from './NotificationContext.js';

export function useNotify() {
  const { notify, dismiss } = useNotificationQueue();
  return useMemo(() => {
    const toned = (tone: Tone) => (message: string, opts?: NotifyOptions) =>
      notify(message, { ...opts, tone });
    return {
      notify,
      dismiss,
      success: toned('success'),
      error: toned('error'),
      warning: toned('warning'),
      info: toned('info'),
    };
  }, [notify, dismiss]);
}
