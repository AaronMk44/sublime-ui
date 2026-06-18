import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from '../lib/generators/config.js';
import {
  renderComponentTypes, renderComponentWeb, renderComponentNative, renderComponentIndex,
} from '../lib/generators/render-component.js';
import { updateBarrel } from '../lib/generators/barrel.js';
import { safeWrite, FileExistsError } from '../lib/generators/write.js';
import { log } from '../util/log.js';

export async function makeComponent(opts: {
  name: string;
  cwd: string;
  mobileOnly: boolean;
  force: boolean;
}): Promise<number> {
  const cfg = loadConfig(opts.cwd);
  const dir = join(opts.cwd, cfg.componentsDir, opts.name);
  try {
    safeWrite(join(dir, `${opts.name}.types.ts`), renderComponentTypes(opts.name), opts.force);
    safeWrite(join(dir, `${opts.name}.tsx`), renderComponentWeb(opts.name, opts.mobileOnly, cfg.importAlias), opts.force);
    safeWrite(join(dir, `${opts.name}.native.tsx`), renderComponentNative(opts.name, cfg.importAlias), opts.force);
    safeWrite(join(dir, 'index.ts'), renderComponentIndex(opts.name), opts.force);
    const barrelPath = join(opts.cwd, cfg.componentsDir, 'index.ts');
    const existing = existsSync(barrelPath) ? readFileSync(barrelPath, 'utf8') : '';
    safeWrite(barrelPath, updateBarrel(existing, `export * from './${opts.name}/index.js';`), true);
    log.success(`Created ${dir}`);
    return 0;
  } catch (err) {
    if (err instanceof FileExistsError) { log.error(err.message); return 1; }
    throw err;
  }
}
