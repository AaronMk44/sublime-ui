import { readFile, writeFile, readdir, mkdir as mkdirFs, rm, access } from 'node:fs/promises';
import { defineNative } from '../define-native';

/**
 * Built-in `fs` native service.
 *
 * A thin, async wrapper over `node:fs/promises` exposed through the native
 * bridge. Text files are read/written as UTF-8 strings; `mkdir` is recursive
 * and `remove` maps to `rm` with `recursive` + `force` so it never throws on
 * a missing path.
 */
export const fs = defineNative('fs', {
  readFile: (path: string): Promise<string> => readFile(path, 'utf8'),
  writeFile: async (path: string, data: string): Promise<void> => {
    await writeFile(path, data, 'utf8');
  },
  exists: async (path: string): Promise<boolean> => {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  },
  readDir: (path: string): Promise<string[]> => readdir(path),
  mkdir: async (path: string): Promise<void> => {
    await mkdirFs(path, { recursive: true });
  },
  remove: async (path: string): Promise<void> => {
    await rm(path, { recursive: true, force: true });
  },
});
