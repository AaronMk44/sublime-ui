import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

export type Tone = 'success' | 'error' | 'warning' | 'info' | 'neutral';

export interface Notification {
  id: string;
  message: string;
  tone: Tone;
  duration: number;
  action?: { label: string; onPress: () => void };
}

export interface NotifyOptions {
  tone?: Tone;
  duration?: number;
  action?: { label: string; onPress: () => void };
}

interface QueueApi {
  queue: Notification[];
  notify: (message: string, opts?: NotifyOptions) => string;
  dismiss: (id: string) => void;
}

const Ctx = createContext<QueueApi | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Notification[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setQueue((q) => q.filter((n) => n.id !== id));
  }, []);

  const notify = useCallback((message: string, opts: NotifyOptions = {}) => {
    counter.current += 1;
    const id = `n${counter.current}`;
    const n: Notification = {
      id,
      message,
      tone: opts.tone ?? 'neutral',
      duration: opts.duration ?? 4000,
      ...(opts.action ? { action: opts.action } : {}),
    };
    setQueue((q) => [...q, n]);
    return id;
  }, []);

  const value = useMemo<QueueApi>(() => ({ queue, notify, dismiss }), [queue, notify, dismiss]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotificationQueue(): QueueApi {
  const api = useContext(Ctx);
  if (api === null) throw new Error('Notifications require a <SublimeProvider>.');
  return api;
}
