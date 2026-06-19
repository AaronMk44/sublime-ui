import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { desktopBuild } from '../../src/commands/desktop-build.js';

let dir = '';
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'desktop-build-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('desktopBuild', () => {
  it('runs electron-forge make in the default desktop dir and returns the runner code', async () => {
    const calls: Array<{ cmd: string; args: string[]; cwd: string }> = [];
    const code = await desktopBuild({
      project: dir,
      runner: async (cmd, args, cwd) => {
        calls.push({ cmd, args, cwd });
        return 0;
      },
    });
    expect(code).toBe(0);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.cmd).toBe('electron-forge');
    expect(calls[0]?.args).toEqual(['make']);
    expect(calls[0]?.cwd).toBe(join(dir, 'desktop'));
  });

  it('resolves the desktop dir from config and propagates the runner exit code', async () => {
    writeFileSync(
      join(dir, 'sublime.config.json'),
      JSON.stringify({ desktop: { dir: 'apps/shell' } }),
    );
    const calls: Array<{ cmd: string; args: string[]; cwd: string }> = [];
    const code = await desktopBuild({
      project: dir,
      runner: async (cmd, args, cwd) => {
        calls.push({ cmd, args, cwd });
        return 2;
      },
    });
    expect(code).toBe(2);
    expect(calls[0]?.cwd).toBe(join(dir, 'apps', 'shell'));
  });
});
