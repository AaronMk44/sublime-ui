/**
 * Electron application entry for the native bridge.
 *
 * `startDesktop` is the single bootstrap the packaged main process calls: once
 * Electron's `app` reports ready it installs the `native:invoke` router onto
 * `ipcMain` and opens the hardened {@link createWindow}. `app` and `ipcMain`
 * are injected so unit tests can drive the flow with fakes (an
 * immediately-resolving `whenReady`, a recording `ipcMain`) without launching
 * Electron. `isDev` selects how the entry is loaded — a dev server URL via
 * `loadURL` versus packaged HTML on disk via `loadFile`, which `createWindow`
 * derives from the `entry` shape.
 */

import { createWindow, type BrowserWindowCtor } from './create-window';
import { installNativeRouter, type IpcMainLike } from '../bridge/main-router';

/** Minimal Electron `app` surface needed to bootstrap. Injectable. */
export interface AppLike {
  whenReady(): Promise<unknown>;
}

/** Options for {@link startDesktop}. */
export interface StartDesktopOptions {
  /** Electron's `app` (or a compatible fake for tests). */
  app: AppLike;
  /** Electron's `ipcMain` (or a compatible fake for tests). */
  ipcMain: IpcMainLike;
  /** URL (dev) or file path (packaged) to load in the window. */
  entry: string;
  /** Absolute path to the preload script. */
  preload: string;
  /** Whether running against a dev server. */
  isDev: boolean;
  /** Injectable `BrowserWindow` constructor; defaults to Electron's. */
  BrowserWindowCtor?: BrowserWindowCtor;
  /**
   * Called if `whenReady` rejects or window creation throws. Defaults to
   * logging the error, so a failed bootstrap never becomes an unhandled
   * promise rejection.
   */
  onError?: (error: unknown) => void;
}

/**
 * Bootstrap the desktop shell: install the native router and open the window
 * once the app is ready.
 *
 * @param opts Bootstrap options; `app`/`ipcMain`/`BrowserWindowCtor` are
 *   injectable for tests.
 */
export function startDesktop(opts: StartDesktopOptions): void {
  const onError =
    opts.onError ??
    ((error: unknown): void => {
      console.error('[sublime/desktop] startDesktop failed:', error);
    });
  void opts.app
    .whenReady()
    .then(() => {
      installNativeRouter(opts.ipcMain);
      createWindow({
        entry: opts.entry,
        preload: opts.preload,
        ...(opts.BrowserWindowCtor !== undefined
          ? { BrowserWindowCtor: opts.BrowserWindowCtor }
          : {}),
      });
    })
    .catch(onError);
}
