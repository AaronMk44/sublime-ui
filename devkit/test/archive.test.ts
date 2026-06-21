import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { create as tarCreate } from 'tar';
import AdmZip from 'adm-zip';
import { extractTarGz, extractZip, extractArchive } from '../src/util/archive.js';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'arc-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('extractTarGz', () => {
  it('round-trips a packed directory back to disk', async () => {
    const src = join(dir, 'src');
    mkdirSync(join(src, 'sub'), { recursive: true });
    writeFileSync(join(src, 'sub', 'a.txt'), 'alpha');
    const tgz = join(dir, 'bundle.tar.gz');
    await tarCreate({ gzip: true, file: tgz, cwd: src }, ['sub']);

    const out = join(dir, 'out');
    await extractTarGz(tgz, out);
    expect(readFileSync(join(out, 'sub', 'a.txt'), 'utf8')).toBe('alpha');
  });
});

describe('extractZip', () => {
  it('round-trips a real zip back to disk (exercises the adm-zip path)', async () => {
    const zipPath = join(dir, 'bundle.zip');
    const z = new AdmZip();
    z.addFile('sub/a.txt', Buffer.from('alpha'));
    z.writeZip(zipPath);

    const out = join(dir, 'out');
    await extractZip(zipPath, out);
    expect(readFileSync(join(out, 'sub', 'a.txt'), 'utf8')).toBe('alpha');
  });
});

describe('extractArchive', () => {
  it('routes .zip to the zip extractor', async () => {
    const zipPath = join(dir, 'bundle.zip');
    const z = new AdmZip();
    z.addFile('c.txt', Buffer.from('gamma'));
    z.writeZip(zipPath);

    const out = join(dir, 'out');
    await extractArchive(zipPath, out);
    expect(existsSync(join(out, 'c.txt'))).toBe(true);
  });

  it('routes .tar.gz to the tar extractor', async () => {
    const src = join(dir, 'src');
    mkdirSync(src, { recursive: true });
    writeFileSync(join(src, 'b.txt'), 'beta');
    const tgz = join(dir, 'bundle.tgz');
    await tarCreate({ gzip: true, file: tgz, cwd: src }, ['b.txt']);

    const out = join(dir, 'out');
    await extractArchive(tgz, out);
    expect(existsSync(join(out, 'b.txt'))).toBe(true);
  });

  it('throws on an unknown archive extension', async () => {
    await expect(extractArchive(join(dir, 'x.rar'), join(dir, 'o'))).rejects.toThrow(/unsupported archive/i);
  });
});
