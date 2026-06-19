import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { fs } from '../../src/services/fs';

describe('fs service', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'sublime-fs-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('is a native service named "fs"', () => {
    expect(fs.name).toBe('fs');
  });

  it('round-trips writeFile → readFile', async () => {
    const file = join(dir, 'note.txt');
    await fs.methods.writeFile(file, 'hello world');
    await expect(fs.methods.readFile(file)).resolves.toBe('hello world');
  });

  it('reports existence true/false', async () => {
    const file = join(dir, 'present.txt');
    await fs.methods.writeFile(file, 'x');
    await expect(fs.methods.exists(file)).resolves.toBe(true);
    await expect(fs.methods.exists(join(dir, 'missing.txt'))).resolves.toBe(false);
  });

  it('lists directory entries', async () => {
    await fs.methods.writeFile(join(dir, 'a.txt'), '1');
    await fs.methods.writeFile(join(dir, 'b.txt'), '2');
    const entries = await fs.methods.readDir(dir);
    expect([...entries].sort()).toEqual(['a.txt', 'b.txt']);
  });

  it('creates directories recursively', async () => {
    const nested = join(dir, 'one', 'two', 'three');
    await fs.methods.mkdir(nested);
    await expect(fs.methods.exists(nested)).resolves.toBe(true);
  });

  it('removes files and directories recursively', async () => {
    const sub = join(dir, 'sub');
    await fs.methods.mkdir(sub);
    await fs.methods.writeFile(join(sub, 'c.txt'), '3');
    await fs.methods.remove(sub);
    await expect(fs.methods.exists(sub)).resolves.toBe(false);
  });
});
