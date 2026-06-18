import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export class FileExistsError extends Error {
  readonly path: string;
  constructor(path: string) {
    super(`File already exists: ${path} (use --force to overwrite)`);
    this.name = 'FileExistsError';
    this.path = path;
    Object.setPrototypeOf(this, FileExistsError.prototype);
  }
}

export function safeWrite(path: string, content: string, force: boolean): void {
  if (existsSync(path) && !force) throw new FileExistsError(path);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}
