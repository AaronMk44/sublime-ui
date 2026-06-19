import { describe, it, expect } from 'vitest';
import { createWindow } from '../../src/shell/create-window';

interface ConstructArgs {
  webPreferences?: {
    contextIsolation?: boolean;
    nodeIntegration?: boolean;
    preload?: string;
  };
}

function fakeBrowserWindow() {
  const calls = {
    construct: undefined as ConstructArgs | undefined,
    loadURL: [] as string[],
    loadFile: [] as string[],
  };
  class FakeWindow {
    constructor(opts: ConstructArgs) {
      calls.construct = opts;
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

describe('createWindow', () => {
  it('constructs a BrowserWindow with secure webPreferences and the given preload', () => {
    const { FakeWindow, calls } = fakeBrowserWindow();
    createWindow({
      entry: 'http://localhost:3000',
      preload: '/path/to/preload.js',
      BrowserWindowCtor: FakeWindow as never,
    });
    expect(calls.construct?.webPreferences).toMatchObject({
      contextIsolation: true,
      nodeIntegration: false,
      preload: '/path/to/preload.js',
    });
  });

  it('loads an http(s) entry via loadURL', () => {
    const { FakeWindow, calls } = fakeBrowserWindow();
    createWindow({
      entry: 'http://localhost:3000',
      preload: '/p.js',
      BrowserWindowCtor: FakeWindow as never,
    });
    expect(calls.loadURL).toEqual(['http://localhost:3000']);
    expect(calls.loadFile).toEqual([]);
  });

  it('loads a file entry via loadFile', () => {
    const { FakeWindow, calls } = fakeBrowserWindow();
    createWindow({
      entry: '/dist/index.html',
      preload: '/p.js',
      BrowserWindowCtor: FakeWindow as never,
    });
    expect(calls.loadFile).toEqual(['/dist/index.html']);
    expect(calls.loadURL).toEqual([]);
  });

  it('returns the constructed window', () => {
    const { FakeWindow } = fakeBrowserWindow();
    const win = createWindow({
      entry: 'https://example.com',
      preload: '/p.js',
      BrowserWindowCtor: FakeWindow as never,
    });
    expect(win).toBeInstanceOf(FakeWindow);
  });
});
