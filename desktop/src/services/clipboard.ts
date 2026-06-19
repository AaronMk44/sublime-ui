import { defineNative } from '../define-native';
import { getElectron } from './get-electron';

/**
 * Built-in `clipboard` native service.
 *
 * Thin async wrappers over Electron's synchronous `clipboard` module so the
 * surface stays uniform across the native bridge (every method is a Promise).
 * The Electron module is resolved lazily so the package loads without Electron
 * and unit tests can mock it.
 */
export const clipboard = defineNative('clipboard', {
  readText: async (): Promise<string> => {
    const { clipboard: c } = await getElectron();
    return c.readText();
  },
  writeText: async (text: string): Promise<void> => {
    const { clipboard: c } = await getElectron();
    c.writeText(text);
  },
});
