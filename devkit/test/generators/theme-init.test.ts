import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { themeInit } from '../../src/commands/theme-init.js';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'ti-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('themeInit', () => {
  it('writes tokens.json and a typed tokens.ts wrapper', async () => {
    const fake = { color: { light: { primary: '#000' } }, radii: { md: 12 } };
    const code = await themeInit({ cwd: dir, force: false, loadDefaultTokens: async () => fake });
    expect(code).toBe(0);
    const jsonPath = join(dir, 'src/theme/tokens.json');
    expect(existsSync(jsonPath)).toBe(true);
    expect(JSON.parse(readFileSync(jsonPath, 'utf8'))).toEqual(fake);
    const wrapper = readFileSync(join(dir, 'src/theme/tokens.ts'), 'utf8');
    expect(wrapper).toContain("import data from './tokens.json'");
    expect(wrapper).toContain('export const tokens = data as SublimeTokens;');
  });
});
