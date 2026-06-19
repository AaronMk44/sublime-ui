import { join } from 'node:path';
import { loadConfig } from '../lib/generators/config.js';
import { runInherit } from '../util/exec.js';

/** Runs a process in `cwd` and resolves with its exit code. */
export type DesktopRunner = (cmd: string, args: string[], cwd: string) => Promise<number>;

const defaultRunner: DesktopRunner = (cmd, args, cwd) => runInherit(cmd, args, { cwd });

/**
 * Resolves the app's desktop dir from config (default `desktop`) and spawns
 * `electron-forge make` there. Returns the runner's exit code (non-zero on failure).
 */
export async function desktopBuild(opts: {
  project: string;
  runner?: DesktopRunner;
}): Promise<number> {
  const cfg = loadConfig(opts.project);
  const desktopDir = join(opts.project, cfg.desktop?.dir ?? 'desktop');
  const runner = opts.runner ?? defaultRunner;
  return runner('electron-forge', ['make'], desktopDir);
}
