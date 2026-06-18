import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { parse, join } from 'node:path';
import { themeInit } from '../../src/commands/theme-init.js';

// Build the fixture under a path with NO spaces or Windows 8.3 "~" segments.
// The production resolver dynamically imports the resolved tokens file by file
// URL; under vitest that import runs through vite-node, whose loader mishandles
// percent-encoded URLs (e.g. os.tmpdir() here is "C:\Users\AARONM~1\..."). We
// therefore root the fixture at the temp drive's root, which is always clean.
// (Plain Node — the shipped CLI — handles the encoded URLs fine; this only
// affects the test harness, not production behavior.)
const cleanTmpRoot = join(parse(tmpdir()).root, 'sublime-devkit-tests');

let dir = '';
beforeEach(() => {
  mkdirSync(cleanTmpRoot, { recursive: true });
  dir = mkdtempSync(join(cleanTmpRoot, 'ti-resolve-'));
});
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('themeInit real resolver', () => {
  it('resolves defaultTokens from an installed library whose exports map only exposes "."', async () => {
    const libDir = join(dir, 'node_modules', '@sublime-ui', 'library');
    const distDir = join(libDir, 'dist');
    const tokensDir = join(distDir, 'tokens');
    mkdirSync(tokensDir, { recursive: true });

    // Mirrors the real merged exports map: NO "./package.json" subpath.
    writeFileSync(
      join(libDir, 'package.json'),
      JSON.stringify({
        name: '@sublime-ui/library',
        version: '0.0.0',
        type: 'module',
        exports: { '.': { types: './dist/index.d.ts', import: './dist/index.js' } },
      }),
    );
    writeFileSync(join(distDir, 'index.js'), "export { defaultTokens } from './tokens/tokens.js';\n");
    const fixture = { color: { light: { primary: '#abc' } } };
    writeFileSync(
      join(tokensDir, 'tokens.js'),
      `export const defaultTokens = ${JSON.stringify(fixture)};\n`,
    );

    // No loadDefaultTokens injection: drives the production resolveDefaultTokens path.
    const code = await themeInit({ cwd: dir, force: false });
    expect(code).toBe(0);

    const jsonPath = join(dir, 'src/theme/tokens.json');
    expect(existsSync(jsonPath)).toBe(true);
    expect(JSON.parse(readFileSync(jsonPath, 'utf8'))).toEqual(fixture);
  });
});
