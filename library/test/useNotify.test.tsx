import { describe, it, expect } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { NotificationProvider, useNotificationQueue } from '../src/notifications/NotificationContext.js';
import { useNotify } from '../src/notifications/useNotify.js';

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(NotificationProvider, { children });

describe('useNotify', () => {
  it('enqueues with the right tone', () => {
    const { result } = renderHook(
      () => ({ notify: useNotify(), queue: useNotificationQueue() }),
      { wrapper },
    );
    act(() => { result.current.notify.success('Saved'); });
    expect(result.current.queue.queue).toHaveLength(1);
    expect(result.current.queue.queue[0]!.message).toBe('Saved');
    expect(result.current.queue.queue[0]!.tone).toBe('success');
  });

  it('dismiss removes by id', () => {
    const { result } = renderHook(
      () => ({ notify: useNotify(), queue: useNotificationQueue() }),
      { wrapper },
    );
    act(() => { result.current.notify.error('Boom'); });
    const id = result.current.queue.queue[0]!.id;
    act(() => { result.current.notify.dismiss(id); });
    expect(result.current.queue.queue).toHaveLength(0);
  });
});
