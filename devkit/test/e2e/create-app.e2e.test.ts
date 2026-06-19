import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execa } from 'execa';
import { initApp } from '../../src/lib/scaffold/init.js';

let dir = '';
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'sublime-e2e-'));
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('create-app e2e (all three targets, real registry)', () => {
  it('scaffolds, installs, compiles nav, and typechecks', async () => {
    const app = join(dir, 'demo');
    const run = async (cmd: string, args: string[], cwd: string) =>
      (
        await execa(cmd, args, {
          cwd,
          reject: false,
          env: { ...process.env, ELECTRON_SKIP_BINARY_DOWNLOAD: '1' },
        })
      ).exitCode ?? 1;

    const code = await initApp({
      dir: app,
      name: 'demo',
      targets: ['web', 'mobile', 'desktop'],
      install: true,
      git: false,
      yes: true,
      runner: run,
    });
    expect(code).toBe(0);
    expect(existsSync(join(app, 'node_modules/@sublime-ui/framework'))).toBe(true);
    expect(existsSync(join(app, 'src/navigation/navigation.web.tsx'))).toBe(true);

    const tc = await execa('npx', ['tsc', '--noEmit'], { cwd: app, reject: false });
    expect(tc.exitCode, tc.stdout + tc.stderr).toBe(0);
  }, 600_000);
});
