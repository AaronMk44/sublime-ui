import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  rmSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { parse, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNav } from '../../src/commands/build-nav.js';

// Regenerate the committed nav-app fixture and assert the output is byte-for-byte
// what is checked in. The `typecheck:fixture` script then `tsc`s those committed
// files against the real platform peers; this test guarantees they are not stale.
//
// `buildNav` dynamic-imports the storybooks by file URL; under vite-node a
// space in the worktree path breaks that loader, so we assemble the app in a
// clean temp root whose path needs no percent-encoding (same trick as the
// build:nav smoke test).
const cleanTmpRoot = join(parse(tmpdir()).root, 'sublime-devkit-tests');
const fixtureNav = fileURLToPath(new URL('../fixtures/nav-app/src/navigation/', import.meta.url));

const GENERATED = [
  'navigation.native.tsx',
  'navigation.web.tsx',
  'routes.d.ts',
  'index.ts',
] as const;

let dir = '';
let navDir = '';
beforeEach(() => {
  mkdirSync(cleanTmpRoot, { recursive: true });
  dir = mkdtempSync(join(cleanTmpRoot, 'fixture-build-'));
  navDir = join(dir, 'src', 'navigation');
  mkdirSync(navDir, { recursive: true });
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('nav-app fixture', () => {
  it('regenerates byte-for-byte to the committed generated output', async () => {
    copyFileSync(join(fixtureNav, 'storybook.native.ts'), join(navDir, 'storybook.native.ts'));
    copyFileSync(join(fixtureNav, 'storybook.web.ts'), join(navDir, 'storybook.web.ts'));

    const code = await buildNav({ cwd: dir });
    expect(code).toBe(0);

    for (const file of GENERATED) {
      const fresh = readFileSync(join(navDir, file), 'utf8');
      const committed = readFileSync(join(fixtureNav, file), 'utf8');
      expect(fresh, `${file} is stale — re-run build:nav against the fixture`).toBe(committed);
    }
  });
});
