import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { parse, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStorybook } from '../../src/lib/navigation/load-storybook.js';

// The production loader dynamic-imports the storybook by file URL. Under vitest
// that import runs through vite-node, whose loader mishandles percent-encoded
// URLs (e.g. the worktree path contains a space). We copy the committed fixture
// to a clean temp root so the file URL needs no encoding. (Plain Node — the
// shipped CLI — handles encoded URLs fine; this only affects the harness.)
const cleanTmpRoot = join(parse(tmpdir()).root, 'sublime-devkit-tests');
const fixtureSrc = fileURLToPath(
  new URL('../fixtures/nav-app/src/navigation/storybook.native.ts', import.meta.url),
);

let dir = '';
let fixture = '';
beforeEach(() => {
  mkdirSync(cleanTmpRoot, { recursive: true });
  dir = mkdtempSync(join(cleanTmpRoot, 'load-sb-'));
  fixture = join(dir, 'storybook.native.ts');
  mkdirSync(dirname(fixture), { recursive: true });
  copyFileSync(fixtureSrc, fixture);
});
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('loadStorybook', () => {
  it('walks the default-exported BookDef into a root RouteNode', async () => {
    const root = await loadStorybook(fixture);
    expect(root.key).toBe('root');
    expect(root.kind).toBe('book');
    expect(root.format).toBe('bottomNav');
  });

  it('emits a home page child with its component name and options', async () => {
    const root = await loadStorybook(fixture);
    const home = root.children?.find((c) => c.key === 'home');
    expect(home).toBeDefined();
    expect(home?.kind).toBe('page');
    expect(home?.component).toBe('Home');
    expect(home?.options.title).toBe('Home');
  });

  it('resolves a linked sub-book into a nested book node', async () => {
    const root = await loadStorybook(fixture);
    const settings = root.children?.find((c) => c.key === 'settings');
    expect(settings?.kind).toBe('book');
    expect(settings?.format).toBe('stack');
    const profile = settings?.children?.find((c) => c.key === 'profile');
    expect(profile?.kind).toBe('page');
    expect(profile?.component).toBe('Profile');
  });
});
