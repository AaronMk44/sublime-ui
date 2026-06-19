import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { desktopDev } from '../../src/commands/desktop-dev.js';

let dir = '';
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'desktop-dev-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('desktopDev', () => {
  it('runs electron-forge start in the default desktop dir and returns the runner code', async () => {
    const calls: Array<{ cmd: string; args: string[]; cwd: string }> = [];
    const code = await desktopDev({
      project: dir,
      runner: async (cmd, args, cwd) => {
        calls.push({ cmd, args, cwd });
        return 0;
      },
    });
    expect(code).toBe(0);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.cmd).toBe('electron-forge');
    expect(calls[0]?.args).toEqual(['start']);
    expect(calls[0]?.cwd).toBe(join(dir, 'desktop'));
  });

  it('resolves the desktop dir from config and propagates the runner exit code', async () => {
    writeFileSync(
      join(dir, 'sublime.config.json'),
      JSON.stringify({ desktop: { dir: 'apps/shell' } }),
    );
    const calls: Array<{ cmd: string; args: string[]; cwd: string }> = [];
    const code = await desktopDev({
      project: dir,
      runner: async (cmd, args, cwd) => {
        calls.push({ cmd, args, cwd });
        return 3;
      },
    });
    expect(code).toBe(3);
    expect(calls[0]?.cwd).toBe(join(dir, 'apps', 'shell'));
  });
});
