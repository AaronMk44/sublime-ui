import { findPackageJSON } from 'node:module';
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { loadConfig } from '../lib/generators/config.js';
import { renderTokensWrapper } from '../lib/generators/render-tokens.js';
import { safeWrite, FileExistsError } from '../lib/generators/write.js';
import { log } from '../util/log.js';

/** Resolves the app's installed @sublime-ui/library and reads its defaultTokens. */
async function resolveDefaultTokens(cwd: string): Promise<unknown> {
  // Locate the package's package.json honoring resolution from the app's cwd.
  // findPackageJSON is condition-agnostic and works against the library's
  // ESM-only exports map (which exposes only "." with an `import` condition and
  // crucially NOT "./package.json"), unlike require.resolve which would need a
  // `require` condition. We then import the pure tokens data file by FILE PATH,
  // bypassing the exports map and avoiding the index's react-native-paper deps.
  const base = pathToFileURL(join(cwd, 'noop.js')).href;
  const pkgJsonPath = findPackageJSON('@sublime-ui/library', base);
  if (!pkgJsonPath) throw new Error('@sublime-ui/library not found');
  const tokensJs = join(dirname(pkgJsonPath), 'dist', 'tokens', 'tokens.js'); // pure data, no Paper/MUI
  const mod = (await import(pathToFileURL(tokensJs).href)) as { defaultTokens: unknown };
  return mod.defaultTokens;
}

export async function themeInit(opts: {
  cwd: string;
  force: boolean;
  loadDefaultTokens?: () => Promise<unknown>;
}): Promise<number> {
  const cfg = loadConfig(opts.cwd);
  let tokens: unknown;
  try {
    tokens = await (opts.loadDefaultTokens ?? (() => resolveDefaultTokens(opts.cwd)))();
  } catch {
    log.error('Could not resolve @sublime-ui/library. Install it in this app first.');
    return 1;
  }
  const jsonPath = join(opts.cwd, cfg.themeDir, 'tokens.json');
  const wrapperPath = join(opts.cwd, cfg.themeDir, 'tokens.ts');
  try {
    safeWrite(jsonPath, JSON.stringify(tokens, null, 2) + '\n', opts.force);
    safeWrite(wrapperPath, renderTokensWrapper(cfg.importAlias), opts.force);
    log.success(`Created ${jsonPath} and ${wrapperPath}`);
    return 0;
  } catch (err) {
    if (err instanceof FileExistsError) { log.error(err.message); return 1; }
    throw err;
  }
}
