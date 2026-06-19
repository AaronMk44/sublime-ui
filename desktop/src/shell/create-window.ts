/**
 * Secure `BrowserWindow` factory.
 *
 * Constructs an Electron window with the hardened defaults the bridge relies
 * on — `contextIsolation: true`, `nodeIntegration: false`, and the given
 * preload — so the renderer can only reach native functionality through the
 * registry-validated `native:invoke` router. The `BrowserWindow` constructor
 * is injectable so unit tests can assert the wiring without launching Electron;
 * in production the real constructor is resolved from the `electron` runtime
 * (this runs in the main process, where requiring `electron` is permitted).
 *
 * `entry` is loaded via `loadURL` when it is an `http(s)` URL (dev server) and
 * via `loadFile` otherwise (packaged HTML on disk).
 */

import { createRequire } from 'node:module';
import type { BrowserWindow } from 'electron';

/** Minimal `BrowserWindow` surface the factory drives. */
export interface BrowserWindowLike {
  loadURL(url: string): unknown;
  loadFile(file: string): unknown;
}

/** Constructor signature for an injectable `BrowserWindow`. */
export type BrowserWindowCtor = new (opts: {
  webPreferences: {
    contextIsolation: boolean;
    nodeIntegration: boolean;
    preload: string;
  };
}) => BrowserWindow;

/** Options for {@link createWindow}. */
export interface CreateWindowOptions {
  /** URL (dev server) or file path (packaged) to load. */
  entry: string;
  /** Absolute path to the preload script. */
  preload: string;
  /** Injectable `BrowserWindow` constructor; defaults to Electron's. */
  BrowserWindowCtor?: BrowserWindowCtor;
}

function resolveCtor(): BrowserWindowCtor {
  const require = createRequire(import.meta.url);
  const electron = require('electron') as { BrowserWindow: BrowserWindowCtor };
  return electron.BrowserWindow;
}

function isUrl(entry: string): boolean {
  return /^https?:\/\//.test(entry);
}

/**
 * Construct a hardened `BrowserWindow` and load `entry`.
 *
 * @param opts Window options; `BrowserWindowCtor` is injectable for tests.
 * @returns The constructed window.
 */
export function createWindow(opts: CreateWindowOptions): BrowserWindow {
  const Ctor = opts.BrowserWindowCtor ?? resolveCtor();
  const win = new Ctor({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: opts.preload,
    },
  });
  if (isUrl(opts.entry)) {
    win.loadURL(opts.entry);
  } else {
    win.loadFile(opts.entry);
  }
  return win;
}
