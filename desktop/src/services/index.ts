/**
 * Built-in native services barrel.
 *
 * Re-exports the five batteries-included services authored with
 * `defineNative` in the main process. Register the ones an app needs via
 * `registerNative([...])`, then consume them in the renderer with `useNative`.
 */

export { fs } from './fs';
export { dialog } from './dialog';
export { shell } from './shell';
export { clipboard } from './clipboard';
export { notifications, type NotifyOptions } from './notifications';
