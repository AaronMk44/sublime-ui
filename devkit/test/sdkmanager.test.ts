import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isValidNdk, acceptLicenses } from '../src/lib/sdkmanager.js';
import type { RunResult, RunOptions } from '../src/util/exec.js';

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

describe('acceptLicenses', () => {
  it('runs sdkmanager --licenses feeding repeated "y" on stdin', async () => {
    const calls: Array<{ file: string; args: string[]; opts: RunOptions }> = [];
    const runner = async (file: string, args: string[], opts: RunOptions): Promise<RunResult> => {
      calls.push({ file, args, opts });
      return { stdout: '', stderr: '', exitCode: 0 };
    };
    const code = await acceptLicenses('/sdk', '/jdk', runner);
    expect(code).toBe(0);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.file).toContain('sdkmanager');
    expect(calls[0]!.args).toContain('--licenses');
    expect(calls[0]!.args).toContain('--sdk_root=/sdk');
    // Several acceptances, scoped to the managed JDK.
    expect((calls[0]!.opts.input ?? '').match(/y/g)!.length).toBeGreaterThanOrEqual(10);
    expect(calls[0]!.opts.env).toMatchObject({ JAVA_HOME: '/jdk', ANDROID_HOME: '/sdk' });
  });
});
