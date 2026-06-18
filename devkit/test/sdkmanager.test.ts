import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isValidNdk } from '../src/lib/sdkmanager.js';

let dir = '';
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ndk-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('isValidNdk', () => {
  it('false when the dir lacks source.properties', () => {
    expect(isValidNdk(dir)).toBe(false);
  });

  it('true when source.properties + ndk-build + clang exist', () => {
    writeFileSync(join(dir, 'source.properties'), 'Pkg.Revision = 27.1.12297006');
    writeFileSync(join(dir, 'ndk-build.cmd'), '');
    const clangDir = join(dir, 'toolchains', 'llvm', 'prebuilt', 'windows-x86_64', 'bin');
    mkdirSync(clangDir, { recursive: true });
    writeFileSync(join(clangDir, 'clang.exe'), '');
    expect(isValidNdk(dir)).toBe(true);
  });

  it('false when only package.xml exists (corrupt partial install)', () => {
    writeFileSync(join(dir, 'package.xml'), '<x/>');
    expect(isValidNdk(dir)).toBe(false);
  });
});
