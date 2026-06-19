import { existsSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { buildScaffoldPlan } from './plan.js';
import { safeWrite, FileExistsError } from '../generators/write.js';
import { log } from '../../util/log.js';
import { runInherit } from '../../util/exec.js';
import type { ScaffoldOptions, Target } from './types.js';

export type Prompt = (ctx: { dir: string }) => Promise<{ name: string; targets: Target[] }>;
export type PostRunner = (cmd: string, args: string[], cwd: string) => Promise<number>;

const defaultRunner: PostRunner = (cmd, args, cwd) => runInherit(cmd, args, { cwd });

/** npm package-name rules: lowercase, url-safe, no leading dot/underscore, <=214 chars. */
export function isValidNpmName(s: string): boolean {
  return /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(s) && s.length <= 214;
}

function isEmptyDir(dir: string): boolean {
  if (!existsSync(dir)) return true;
  return readdirSync(dir).length === 0;
}

export async function initApp(
  opts: ScaffoldOptions & { prompt?: Prompt; runner?: PostRunner },
): Promise<number> {
  const runner = opts.runner ?? defaultRunner;

  // Resolve name + targets: flags win; otherwise prompt (unless --yes, then defaults).
  let name = opts.name;
  let targets = opts.targets;
  if ((name === undefined || targets === undefined) && !opts.yes && opts.prompt) {
    const answered = await opts.prompt({ dir: opts.dir });
    name ??= answered.name;
    targets ??= answered.targets;
  }
  name ??= basename(opts.dir);
  targets ??= ['web', 'mobile', 'desktop'];

  // Validate.
  if (!isValidNpmName(name)) {
    log.error(`Invalid app name "${name}". Use a valid npm package name (lowercase, url-safe).`);
    return 1;
  }
  if (targets.length === 0) {
    log.error('Select at least one target (web, mobile, desktop).');
    return 1;
  }
  if (targets.includes('desktop') && !targets.includes('web')) {
    log.error('The desktop target renders the web UI — enable "web" alongside "desktop".');
    return 1;
  }

  // Guard the directory.
  const force = opts.force ?? false;
  if (!isEmptyDir(opts.dir) && !force) {
    log.error(`Target directory ${opts.dir} is not empty (use --force to scaffold into it).`);
    return 1;
  }

  // Write the plan.
  const plan = buildScaffoldPlan({ name, targets });
  try {
    for (const file of plan) safeWrite(join(opts.dir, file.path), file.contents, force);
  } catch (err) {
    if (err instanceof FileExistsError) { log.error(err.message); return 1; }
    throw err;
  }
  log.success(`Scaffolded ${name} (${targets.join(', ')}) in ${opts.dir}`);

  // Post-scaffold steps.
  if (opts.git ?? true) {
    await runner('git', ['init', '-q'], opts.dir);
  }
  if (opts.install ?? true) {
    log.step('Installing dependencies…');
    const installCode = await runner('npm', ['install', '--legacy-peer-deps'], opts.dir);
    if (installCode !== 0) { log.warn('npm install failed — run it manually.'); return 0; }
    log.step('Compiling navigation (build:nav)…');
    await runner('npx', ['sublime', 'build:nav'], opts.dir);
  }

  // Next steps.
  log.info('');
  log.info(`Next:  cd ${basename(opts.dir)}`);
  if (!(opts.install ?? true)) log.info('       npm install && npm run build:nav');
  if (targets.includes('web')) log.info('       npm run dev:web');
  if (targets.includes('mobile')) log.info('       npm run dev:mobile');
  if (targets.includes('desktop')) log.info('       npm run desktop:dev');
  return 0;
}
