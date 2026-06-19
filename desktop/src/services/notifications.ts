import { defineNative } from '../define-native';
import { getElectron } from './get-electron';

/** Options for {@link notifications}'s `notify` method. */
export interface NotifyOptions {
  /** Title line of the notification. */
  title: string;
  /** Body text of the notification. */
  body: string;
}

/**
 * Built-in `notifications` native service.
 *
 * Constructs and shows a native OS notification via Electron's `Notification`
 * class. The Electron module is resolved lazily so the package loads without
 * Electron and unit tests can mock it.
 */
export const notifications = defineNative('notifications', {
  notify: async ({ title, body }: NotifyOptions): Promise<void> => {
    const { Notification } = await getElectron();
    new Notification({ title, body }).show();
  },
});
