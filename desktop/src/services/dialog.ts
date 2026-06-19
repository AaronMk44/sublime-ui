import type { MessageBoxOptions } from 'electron';
import { defineNative } from '../define-native';
import { getElectron } from './get-electron';

/**
 * Built-in `dialog` native service.
 *
 * Thin async wrappers over Electron's `dialog` module. File pickers collapse
 * Electron's `{ canceled, filePaths }` / `{ canceled, filePath }` shapes down
 * to a single selected path or `null` when the user cancels (or selects
 * nothing). The Electron module is resolved lazily so the package loads
 * without Electron and unit tests can mock it.
 */
export const dialog = defineNative('dialog', {
  openFile: async (): Promise<string | null> => {
    const { dialog: d } = await getElectron();
    const result = await d.showOpenDialog({ properties: ['openFile'] });
    if (result.canceled) return null;
    return result.filePaths[0] ?? null;
  },
  saveFile: async (): Promise<string | null> => {
    const { dialog: d } = await getElectron();
    const result = await d.showSaveDialog({});
    if (result.canceled) return null;
    return result.filePath ?? null;
  },
  message: async (opts: MessageBoxOptions): Promise<void> => {
    const { dialog: d } = await getElectron();
    await d.showMessageBox(opts);
  },
});
