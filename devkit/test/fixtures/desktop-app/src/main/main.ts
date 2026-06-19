import { app, ipcMain } from 'electron';
import { startDesktop } from '@sublime-ui/desktop';

// These constants are injected by the Electron Forge Webpack plugin.
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

startDesktop({
  app,
  ipcMain,
  entry: MAIN_WINDOW_WEBPACK_ENTRY,
  preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
  isDev: !app.isPackaged,
});
