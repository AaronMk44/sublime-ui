import type { DatabaseAdapter } from '@sublime-ui/framework';
import { IndexedDbAdapter } from './web.js';

/**
 * Web-condition resolver (SP1 §6.5). The web bundle ships IndexedDB. Desktop
 * runs the SAME web bundle inside Electron, so Task I2 adds a RUNTIME probe here
 * for the desktop native bridge via `getNative('sqlite')` from
 * `@sublime-ui/desktop/client` (which works over `globalThis.sublimeNative.invoke`
 * — the one real IPC channel). When that proxy is available, I2 returns the
 * desktop SQLite-over-IPC adapter; otherwise this plain-web entry returns
 * IndexedDB. Native deps never enter the web bundle.
 */
export function createDatabaseAdapter(): DatabaseAdapter {
  // Desktop branch added in I2 (getNative('sqlite') -> createDesktopSqliteAdapter()).
  return new IndexedDbAdapter();
}
