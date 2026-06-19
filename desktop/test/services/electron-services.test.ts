import { describe, it, expect, beforeEach, vi } from 'vitest';

// Fakes for the Electron APIs the services drive. They are mutated per-test so
// each case can control return values and inspect the arguments the service
// forwarded to Electron.
const showOpenDialog = vi.fn();
const showSaveDialog = vi.fn();
const showMessageBox = vi.fn();
const openExternal = vi.fn();
const openPath = vi.fn();
const showItemInFolder = vi.fn();
const clipboardReadText = vi.fn();
const clipboardWriteText = vi.fn();
const notificationShow = vi.fn();
const NotificationCtor = vi.fn();

vi.mock('electron', () => {
  class Notification {
    constructor(opts: unknown) {
      NotificationCtor(opts);
    }
    show() {
      notificationShow();
    }
  }
  return {
    dialog: {
      showOpenDialog: (...args: unknown[]) => showOpenDialog(...args),
      showSaveDialog: (...args: unknown[]) => showSaveDialog(...args),
      showMessageBox: (...args: unknown[]) => showMessageBox(...args),
    },
    shell: {
      openExternal: (...args: unknown[]) => openExternal(...args),
      openPath: (...args: unknown[]) => openPath(...args),
      showItemInFolder: (...args: unknown[]) => showItemInFolder(...args),
    },
    clipboard: {
      readText: (...args: unknown[]) => clipboardReadText(...args),
      writeText: (...args: unknown[]) => clipboardWriteText(...args),
    },
    Notification,
  };
});

import { dialog } from '../../src/services/dialog';
import { shell } from '../../src/services/shell';
import { clipboard } from '../../src/services/clipboard';
import { notifications } from '../../src/services/notifications';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('dialog service', () => {
  it('is named "dialog"', () => {
    expect(dialog.name).toBe('dialog');
  });

  it('openFile returns the first selected path', async () => {
    showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/a.txt', '/b.txt'] });
    await expect(dialog.methods.openFile()).resolves.toBe('/a.txt');
  });

  it('openFile returns null when canceled', async () => {
    showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });
    await expect(dialog.methods.openFile()).resolves.toBeNull();
  });

  it('openFile returns null when no path is selected', async () => {
    showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [] });
    await expect(dialog.methods.openFile()).resolves.toBeNull();
  });

  it('saveFile returns the chosen path', async () => {
    showSaveDialog.mockResolvedValue({ canceled: false, filePath: '/out.txt' });
    await expect(dialog.methods.saveFile()).resolves.toBe('/out.txt');
  });

  it('saveFile returns null when canceled', async () => {
    showSaveDialog.mockResolvedValue({ canceled: true, filePath: undefined });
    await expect(dialog.methods.saveFile()).resolves.toBeNull();
  });

  it('message forwards options to showMessageBox', async () => {
    showMessageBox.mockResolvedValue({ response: 0 });
    await dialog.methods.message({ message: 'hi', title: 'T' });
    expect(showMessageBox).toHaveBeenCalledWith({ message: 'hi', title: 'T' });
  });
});

describe('shell service', () => {
  it('is named "shell"', () => {
    expect(shell.name).toBe('shell');
  });

  it('openExternal forwards the url', async () => {
    openExternal.mockResolvedValue(undefined);
    await shell.methods.openExternal('https://example.com');
    expect(openExternal).toHaveBeenCalledWith('https://example.com');
  });

  it('openPath forwards the path', async () => {
    openPath.mockResolvedValue('');
    await shell.methods.openPath('/some/dir');
    expect(openPath).toHaveBeenCalledWith('/some/dir');
  });

  it('showItemInFolder forwards the path', async () => {
    await shell.methods.showItemInFolder('/some/file.txt');
    expect(showItemInFolder).toHaveBeenCalledWith('/some/file.txt');
  });
});

describe('clipboard service', () => {
  it('is named "clipboard"', () => {
    expect(clipboard.name).toBe('clipboard');
  });

  it('readText returns the clipboard contents', async () => {
    clipboardReadText.mockReturnValue('copied');
    await expect(clipboard.methods.readText()).resolves.toBe('copied');
  });

  it('writeText writes to the clipboard', async () => {
    await clipboard.methods.writeText('hello');
    expect(clipboardWriteText).toHaveBeenCalledWith('hello');
  });
});

describe('notifications service', () => {
  it('is named "notifications"', () => {
    expect(notifications.name).toBe('notifications');
  });

  it('notify constructs and shows a Notification', async () => {
    await notifications.methods.notify({ title: 'Title', body: 'Body' });
    expect(NotificationCtor).toHaveBeenCalledWith({ title: 'Title', body: 'Body' });
    expect(notificationShow).toHaveBeenCalledTimes(1);
  });
});
