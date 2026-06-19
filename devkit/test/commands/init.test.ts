import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInit } from '../../src/commands/init.js';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'init-cmd-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('runInit', () => {
  it('parses --targets and scaffolds without prompting under --yes', async () => {
    const app = join(dir, 'app');
    const code = await runInit({
      dir: app, name: 'app', targets: 'web,desktop',
      install: false, git: false, force: false, yes: true,
      runner: async () => 0,
    });
    expect(code).toBe(0);
    expect(existsSync(join(app, 'desktop/forge.config.ts'))).toBe(true);
    expect(existsSync(join(app, 'web/main.tsx'))).toBe(true);
  });
});
