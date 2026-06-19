import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { parse, join } from 'node:path';
import { buildNav } from '../../src/commands/build-nav.js';

// `buildNav` dynamic-imports storybooks by file URL; under vite-node a space in
// the worktree path breaks that loader, so we assemble the app in a clean temp
// root whose path needs no percent-encoding (same trick as the smoke test).
const cleanTmpRoot = join(parse(tmpdir()).root, 'sublime-devkit-tests');

const NATIVE = `import { book, page } from '@sublime-ui/ui/navigation';
export function Home() { return null; }
export function ProductDetail() { return null; }
export function MobileExtra() { return null; }
export default book({
  format: 'bottomNav',
  pages: {
    home: page(Home, { title: 'Home' }),
    product: page<{ id: number }>(ProductDetail, { title: 'Product' }),
    mobileExtra: page(MobileExtra, { title: 'Extra' }),
  },
});
`;

const WEB = `import { book, page } from '@sublime-ui/ui/navigation';
export function Home() { return null; }
export function ProductDetail() { return null; }
export function WebOnly() { return null; }
export default book({
  format: 'sidebar',
  pages: {
    home: page(Home, { title: 'Home' }),
    product: page<{ id: number }>(ProductDetail, { title: 'Product' }),
    webOnly: page(WebOnly, { title: 'Web Only' }),
  },
});
`;

let dir = '';
let navDir = '';
beforeEach(() => {
  mkdirSync(cleanTmpRoot, { recursive: true });
  dir = mkdtempSync(join(cleanTmpRoot, 'build-nav-params-'));
  navDir = join(dir, 'src', 'navigation');
  mkdirSync(navDir, { recursive: true });
});
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('buildNav route map', () => {
  it('captures the page<...> param type into routes.d.ts', async () => {
    writeFileSync(join(navDir, 'storybook.native.ts'), NATIVE);
    writeFileSync(join(navDir, 'storybook.web.ts'), WEB);
    const code = await buildNav({ cwd: dir });
    expect(code).toBe(0);
    const dts = readFileSync(join(navDir, 'routes.d.ts'), 'utf8');
    expect(dts).toContain('product: { id: number };');
    expect(dts).toContain('home: void;');
  });

  it('unions route keys from both platforms (web-only and native-only keys)', async () => {
    writeFileSync(join(navDir, 'storybook.native.ts'), NATIVE);
    writeFileSync(join(navDir, 'storybook.web.ts'), WEB);
    await buildNav({ cwd: dir });
    const dts = readFileSync(join(navDir, 'routes.d.ts'), 'utf8');
    expect(dts).toContain('webOnly: void;');
    expect(dts).toContain('mobileExtra: void;');
  });

  it('fails (non-zero, writes nothing) when both platforms disagree on a key param type', async () => {
    const nativeConflict = NATIVE.replace('page<{ id: number }>(ProductDetail', 'page<{ id: string }>(ProductDetail');
    writeFileSync(join(navDir, 'storybook.native.ts'), nativeConflict);
    writeFileSync(join(navDir, 'storybook.web.ts'), WEB);
    const code = await buildNav({ cwd: dir });
    expect(code).not.toBe(0);
    expect(existsSync(join(navDir, 'routes.d.ts'))).toBe(false);
  });
});
