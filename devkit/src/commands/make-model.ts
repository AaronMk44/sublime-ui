import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from '../lib/generators/config.js';
import { deriveNames } from '../lib/generators/names.js';
import { parseFields } from '../lib/generators/fields.js';
import { renderModel } from '../lib/generators/render-model.js';
import { updateBarrel } from '../lib/generators/barrel.js';
import { safeWrite, FileExistsError } from '../lib/generators/write.js';
import { log } from '../util/log.js';

export async function makeModel(opts: {
  name: string;
  cwd: string;
  fields?: string;
  resource?: string;
  force: boolean;
  promptFields?: () => Promise<string>;
}): Promise<number> {
  const cfg = loadConfig(opts.cwd);
  const names = deriveNames(opts.name);
  const raw = opts.fields ?? (opts.promptFields ? await opts.promptFields() : '');
  const { fields, warnings } = parseFields(raw);
  for (const w of warnings) log.warn(w);

  const content = renderModel({
    className: names.className,
    resource: opts.resource ?? names.resource,
    importAlias: cfg.importAlias,
    fields,
  });
  const modelPath = join(opts.cwd, cfg.modelsDir, `${names.fileName}.ts`);
  const barrelPath = join(opts.cwd, cfg.modelsDir, 'index.ts');
  try {
    safeWrite(modelPath, content, opts.force);
    const existing = existsSync(barrelPath) ? readFileSync(barrelPath, 'utf8') : '';
    safeWrite(barrelPath, updateBarrel(existing, `export * from './${names.fileName}.js';`), true);
    log.success(`Created ${modelPath}`);
    return 0;
  } catch (err) {
    if (err instanceof FileExistsError) { log.error(err.message); return 1; }
    throw err;
  }
}
