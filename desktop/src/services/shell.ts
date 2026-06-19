import { defineNative } from '../define-native';
import { getElectron } from './get-electron';

/**
 * Built-in `shell` native service.
 *
 * Thin async wrappers over Electron's `shell` module for opening URLs, paths,
 * and revealing items in the OS file manager. The Electron module is resolved
 * lazily so the package loads without Electron and unit tests can mock it.
 */
export const shell = defineNative('shell', {
  openExternal: async (url: string): Promise<void> => {
    const { shell: s } = await getElectron();
    await s.openExternal(url);
  },
  openPath: async (path: string): Promise<void> => {
    const { shell: s } = await getElectron();
    await s.openPath(path);
  },
  showItemInFolder: async (path: string): Promise<void> => {
    const { shell: s } = await getElectron();
    s.showItemInFolder(path);
  },
});
