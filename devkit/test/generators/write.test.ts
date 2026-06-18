import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { safeWrite, FileExistsError } from '../../src/lib/generators/write.js';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'w-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('safeWrite', () => {
  it('creates parent dirs and writes', () => {
    const p = join(dir, 'a/b/c.ts');
    safeWrite(p, 'hello', false);
    expect(existsSync(p)).toBe(true);
    expect(readFileSync(p, 'utf8')).toBe('hello');
  });
  it('refuses to overwrite without force', () => {
    const p = join(dir, 'x.ts');
    safeWrite(p, 'one', false);
    expect(() => safeWrite(p, 'two', false)).toThrow(FileExistsError);
    expect(readFileSync(p, 'utf8')).toBe('one');
  });
  it('overwrites with force', () => {
    const p = join(dir, 'x.ts');
    safeWrite(p, 'one', false);
    safeWrite(p, 'two', true);
    expect(readFileSync(p, 'utf8')).toBe('two');
  });
});
