import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig, DEFAULT_CONFIG } from '../../src/lib/generators/config.js';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'cfg-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('loadConfig', () => {
  it('returns defaults when no config file', () => {
    expect(loadConfig(dir)).toEqual(DEFAULT_CONFIG);
  });
  it('merges overrides over defaults', () => {
    writeFileSync(join(dir, 'sublime.config.json'), JSON.stringify({ modelsDir: 'app/models' }));
    const cfg = loadConfig(dir);
    expect(cfg.modelsDir).toBe('app/models');
    expect(cfg.componentsDir).toBe(DEFAULT_CONFIG.componentsDir);
  });
  it('ignores unknown keys', () => {
    writeFileSync(join(dir, 'sublime.config.json'), JSON.stringify({ nope: 1, themeDir: 'theme' }));
    const cfg = loadConfig(dir);
    expect(cfg.themeDir).toBe('theme');
    expect('nope' in cfg).toBe(false);
  });
});
