import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';
import { initApp } from '../../src/lib/scaffold/init.js';

/**
 * Bundler e2e — the gate the tsc-only `create-app.e2e` lacked.
 *
 * It scaffolds an app against the LOCAL workspace builds (packed to tarballs, so it
 * catches packaging/bundling bugs BEFORE publish) and runs the REAL bundlers:
 *   - web    → `vite build` must succeed and emit `dist/index.html`
 *   - mobile → `expo prebuild` must generate the native `android/` project
 *
 * These two catch the class of bug that shipped in 0.1.2 and tsc never saw: a web
 * bundle pulling in `react-native`, a misplaced `index.html`, a missing `expo`
 * dependency, and a malformed `app.json`.
 *
 * Desktop's Forge/webpack build is intentionally not run here: it needs the Electron
 * binary (this harness sets ELECTRON_SKIP_BINARY_DOWNLOAD). The desktop-specific
 * webpack config (extensionAlias) and preload import are covered by unit tests in
 * `test/desktop/templates.test.ts`, and the renderer reuses the web graph this test
 * already builds.
 *
 * PREREQUISITE: the workspace packages must be built (`npm run build`) before this
 * runs, since `npm pack` ships each package's `dist`.
 */

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const PACKAGES = ['framework', 'library', 'ui', 'desktop', 'devkit'] as const;

let dir = '';
let tarDir = '';
const tarballs: Record<string, string> = {}; // '@sublime-ui/<pkg>' -> 'file:<abs .tgz>'

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'sublime-bundler-e2e-'));
  tarDir = mkdtempSync(join(tmpdir(), 'sublime-tarballs-'));
  for (const pkg of PACKAGES) {
    const { stdout } = await execa('npm', ['pack', '--json', '--pack-destination', tarDir], {
      cwd: join(repoRoot, pkg),
    });
    const filename = (JSON.parse(stdout) as Array<{ filename: string }>)[0]!.filename;
    tarballs[`@sublime-ui/${pkg}`] = 'file:' + join(tarDir, filename).replace(/\\/g, '/');
  }
}, 300_000);

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
  rmSync(tarDir, { recursive: true, force: true });
});

describe('bundler e2e (local packages, real bundlers)', () => {
  it('builds web with Vite and prebuilds mobile with expo', async () => {
    const app = join(dir, 'demo');
    const env = { ...process.env, ELECTRON_SKIP_BINARY_DOWNLOAD: '1' };
    const run = async (cmd: string, args: string[], cwd: string): Promise<number> =>
      (await execa(cmd, args, { cwd, reject: false, env })).exitCode ?? 1;

    // Scaffold WITHOUT installing — we repoint deps at the local tarballs first.
    const code = await initApp({
      dir: app,
      name: 'demo',
      targets: ['web', 'mobile', 'desktop'],
      install: false,
      git: false,
      yes: true,
      runner: run,
    });
    expect(code).toBe(0);

    // Repoint every @sublime-ui/* dependency at its freshly packed local tarball, and
    // add overrides so transitive @sublime-ui deps resolve to the local builds too.
    const pkgPath = join(app, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      overrides?: Record<string, string>;
    };
    for (const field of ['dependencies', 'devDependencies'] as const) {
      const deps = pkg[field];
      if (!deps) continue;
      for (const name of Object.keys(deps)) {
        if (tarballs[name]) deps[name] = tarballs[name];
      }
    }
    pkg.overrides = { ...(pkg.overrides ?? {}), ...tarballs };
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

    // Install the local builds + compile navigation.
    expect(await run('npm', ['install', '--legacy-peer-deps'], app)).toBe(0);
    expect(await run('npx', ['sublime', 'build:nav'], app)).toBe(0);
    expect(existsSync(join(app, 'src/navigation/navigation.tsx'))).toBe(true);

    // WEB — a real production Vite build must succeed and emit the entry HTML.
    const web = await execa('npm', ['run', 'build:web'], { cwd: app, reject: false, env });
    expect(web.exitCode, web.stdout + web.stderr).toBe(0);
    expect(existsSync(join(app, 'dist/index.html'))).toBe(true);

    // MOBILE — expo prebuild must generate the native android/ project.
    const prebuild = await execa(
      'npx',
      ['expo', 'prebuild', '--platform', 'android', '--no-install'],
      { cwd: app, reject: false, env },
    );
    expect(prebuild.exitCode, prebuild.stdout + prebuild.stderr).toBe(0);
    expect(existsSync(join(app, 'android/build.gradle'))).toBe(true);
  }, 900_000);
});
