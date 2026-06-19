import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initApp } from '../../src/lib/scaffold/init.js';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'sublime-init-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const okRunner = async () => 0;

describe('initApp', () => {
  it('writes the file set and returns 0 (non-interactive, no install/git)', async () => {
    const app = join(dir, 'my-app');
    const code = await initApp({
      dir: app, name: 'my-app', targets: ['web'], install: false, git: false, yes: true,
      runner: okRunner,
    });
    expect(code).toBe(0);
    expect(existsSync(join(app, 'package.json'))).toBe(true);
    expect(existsSync(join(app, 'src/screens/web/TaskList.tsx'))).toBe(true);
    expect(JSON.parse(readFileSync(join(app, 'package.json'), 'utf8')).name).toBe('my-app');
  });

  it('refuses a non-empty dir without force', async () => {
    const app = join(dir, 'busy');
    mkdirSync(app, { recursive: true });
    writeFileSync(join(app, 'keep.txt'), 'x');
    const code = await initApp({ dir: app, name: 'busy', targets: ['web'], install: false, git: false, yes: true, runner: okRunner });
    expect(code).toBe(1);
    expect(existsSync(join(app, 'package.json'))).toBe(false);
  });

  it('rejects desktop without web', async () => {
    const app = join(dir, 'bad');
    const code = await initApp({ dir: app, name: 'bad', targets: ['desktop'], install: false, git: false, yes: true, runner: okRunner });
    expect(code).toBe(1);
  });

  it('rejects an invalid app name', async () => {
    const app = join(dir, 'X');
    const code = await initApp({ dir: app, name: 'Not A Name', targets: ['web'], install: false, git: false, yes: true, runner: okRunner });
    expect(code).toBe(1);
  });

  it('runs install + build:nav through the runner when install=true', async () => {
    const app = join(dir, 'withpost');
    const calls: string[] = [];
    const code = await initApp({
      dir: app, name: 'withpost', targets: ['web'], install: true, git: false, yes: true,
      runner: async (cmd, args, _cwd) => { calls.push([cmd, ...args].join(' ')); return 0; },
    });
    expect(code).toBe(0);
    expect(calls.some((c) => c.startsWith('npm install'))).toBe(true);
    expect(calls.some((c) => c.includes('build:nav'))).toBe(true);
  });

  it('prompts when name/targets are absent and not --yes', async () => {
    const app = join(dir, 'prompted');
    const code = await initApp({
      dir: app, install: false, git: false,
      prompt: async () => ({ name: 'prompted', targets: ['web'] }),
      runner: okRunner,
    });
    expect(code).toBe(0);
    expect(existsSync(join(app, 'package.json'))).toBe(true);
  });
});
