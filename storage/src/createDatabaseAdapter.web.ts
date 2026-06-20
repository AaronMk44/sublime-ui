/**
 * Web/renderer resolver for the platform DatabaseAdapter.
 *
 * The web bundler picks this `.web.ts` entry. At RUNTIME it probes for the
 * desktop native bridge via `getNative('sqlite')` (from `@sublime-ui/desktop/client`,
 * which forwards over `globalThis.sublimeNative.invoke` — the single real IPC
 * channel): on desktop (where the web bundle runs inside Electron) it returns the
 * SQLite-over-IPC adapter; on plain web it returns the IndexedDB adapter. No
 * native module is imported — the desktop path goes through
 * `@sublime-ui/desktop/client` (renderer-safe) and a type-only `SqliteContract`.
 */

import { createIndexedDbAdapter } from './web.js';
import { createDesktopSqliteDriver, createDesktopSqliteAdapter } from './desktop.js';
import type { DatabaseAdapter } from '@sublime-ui/framework';

/** Resolve the DatabaseAdapter for the web bundle (desktop-aware). */
export function createDatabaseAdapter(): DatabaseAdapter {
  // Probe the desktop native bridge: createDesktopSqliteDriver() returns null on
  // plain web (no globalThis.sublimeNative) and a driver inside Electron.
  if (createDesktopSqliteDriver() !== null) {
    // Desktop: the web bundle is running inside Electron with the native bridge.
    return createDesktopSqliteAdapter();
  }
  // Plain web: no native bridge — use IndexedDB.
  return createIndexedDbAdapter();
}
