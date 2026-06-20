import { join } from 'node:path';
import { existsSync, cpSync, mkdirSync } from 'node:fs';
import { loadConfig } from '../lib/generators/config.js';
import { runInherit } from '../util/exec.js';
import { log } from '../util/log.js';

/** Runs a process in `cwd` and resolves with its exit code. */
export type DesktopRunner = (cmd: string, args: string[], cwd: string) => Promise<number>;

const defaultRunner: DesktopRunner = (cmd, args, cwd) => runInherit(cmd, args, { cwd });

/**
 * Resolves the app's desktop dir from config (default `desktop`) and runs the
 * desktop package's `make` script (`electron-forge make`) there. Invoking via
 * `npm run make` (rather than a bare `electron-forge`) puts the desktop package's
 * local `node_modules/.bin` on PATH, so Forge resolves cross-platform without a
 * global install. Returns the runner's exit code (non-zero on failure).
 */
export async function desktopBuild(opts: {
  project: string;
  runner?: DesktopRunner;
}): Promise<number> {
  const cfg = loadConfig(opts.project);
  const desktopDir = join(opts.project, cfg.desktop?.dir ?? 'desktop');
  const runner = opts.runner ?? defaultRunner;
  const code = await runner('npm', ['run', 'make'], desktopDir);
  if (code === 0) {
    // Consolidate Forge's installers under the app-wide dist/ folder so every
    // platform's output lives in one place (web → dist/web, desktop → dist/desktop,
    // mobile → dist/mobile).
    const made = join(desktopDir, 'out', 'make');
    if (existsSync(made)) {
      const dest = join(opts.project, 'dist', 'desktop');
      mkdirSync(dest, { recursive: true });
      cpSync(made, dest, { recursive: true });
      log.success(`Desktop installers copied to ${dest}`);
    }
  }
  return code;
}
