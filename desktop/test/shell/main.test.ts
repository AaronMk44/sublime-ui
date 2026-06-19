import { describe, it, expect } from 'vitest';
import { startDesktop } from '../../src/shell/main';

interface ConstructArgs {
  webPreferences?: {
    contextIsolation?: boolean;
    nodeIntegration?: boolean;
    preload?: string;
  };
}

type Handler = (e: unknown, ...args: any[]) => any;

function fakeApp() {
  return {
    whenReady: () => Promise.resolve(),
  };
}

function fakeIpcMain() {
  const handlers = new Map<string, Handler>();
  return {
    channels: handlers,
    handle(channel: string, listener: Handler) {
      handlers.set(channel, listener);
    },
  };
}

function fakeBrowserWindow() {
  const calls = {
    construct: [] as ConstructArgs[],
    loadURL: [] as string[],
    loadFile: [] as string[],
  };
  class FakeWindow {
    constructor(opts: ConstructArgs) {
      calls.construct.push(opts);
    }
    loadURL(url: string) {
      calls.loadURL.push(url);
    }
    loadFile(file: string) {
      calls.loadFile.push(file);
    }
  }
  return { FakeWindow, calls };
}

describe('startDesktop', () => {
  it('installs the native router and creates a window when the app is ready', async () => {
    const app = fakeApp();
    const ipcMain = fakeIpcMain();
    const { FakeWindow, calls } = fakeBrowserWindow();

    startDesktop({
      app,
      ipcMain,
      entry: 'http://localhost:3000',
      preload: '/path/to/preload.js',
      isDev: true,
      BrowserWindowCtor: FakeWindow as never,
    });

    // whenReady resolves on a microtask; let it flush.
    await Promise.resolve();
    await Promise.resolve();

    expect(ipcMain.channels.has('native:invoke')).toBe(true);
    expect(calls.construct).toHaveLength(1);
    expect(calls.construct[0]?.webPreferences).toMatchObject({
      contextIsolation: true,
      nodeIntegration: false,
      preload: '/path/to/preload.js',
    });
  });

  it('loads the entry via loadURL in dev mode', async () => {
    const app = fakeApp();
    const ipcMain = fakeIpcMain();
    const { FakeWindow, calls } = fakeBrowserWindow();

    startDesktop({
      app,
      ipcMain,
      entry: 'http://localhost:5173',
      preload: '/p.js',
      isDev: true,
      BrowserWindowCtor: FakeWindow as never,
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(calls.loadURL).toEqual(['http://localhost:5173']);
    expect(calls.loadFile).toEqual([]);
  });

  it('routes a rejected whenReady to onError instead of an unhandled rejection', async () => {
    const boom = new Error('whenReady failed');
    const app = { whenReady: () => Promise.reject(boom) };
    const ipcMain = fakeIpcMain();
    const { FakeWindow } = fakeBrowserWindow();
    const seen: unknown[] = [];

    startDesktop({
      app,
      ipcMain,
      entry: '/dist/index.html',
      preload: '/p.js',
      isDev: false,
      BrowserWindowCtor: FakeWindow as never,
      onError: (e) => seen.push(e),
    });

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(seen).toEqual([boom]);
  });

  it('loads the entry via loadFile in production mode', async () => {
    const app = fakeApp();
    const ipcMain = fakeIpcMain();
    const { FakeWindow, calls } = fakeBrowserWindow();

    startDesktop({
      app,
      ipcMain,
      entry: '/dist/index.html',
      preload: '/p.js',
      isDev: false,
      BrowserWindowCtor: FakeWindow as never,
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(calls.loadFile).toEqual(['/dist/index.html']);
    expect(calls.loadURL).toEqual([]);
  });
});
