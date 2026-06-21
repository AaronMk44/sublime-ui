// framework/test/no-native-imports.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

/** Modules core must NEVER import — they belong to @sublime-ui/storage / desktop. */
const FORBIDDEN = ['better-sqlite3', 'expo-sqlite', 'idb', 'electron'];

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...tsFiles(full));
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/**
 * Match `import ... from 'mod'`, bare `import 'mod'`, and `require('mod')`
 * (mod or mod/...).
 *
 * The span between `import` and `from` excludes `;` and quote chars so a bare
 * `import 'idb';` cannot be swallowed by a *later* line's `from` clause (a naive
 * `import[\s\S]*?from` lazily spans across statements and silently misses bare
 * native imports — the exact violation this guard must catch).
 */
function importsOf(source: string): string[] {
  const specs: string[] = [];
  const re = /(?:import[^;'"]*?from\s*|import\s*|require\s*\(\s*)['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) specs.push(m[1]!);
  return specs;
}

describe('core purity — framework/src has no native/RN/DOM-engine imports', () => {
  const files = tsFiles(SRC);

  it('finds source files to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('no framework/src file imports better-sqlite3 / expo-sqlite / idb / electron', () => {
    const violations: string[] = [];
    for (const file of files) {
      const specs = importsOf(readFileSync(file, 'utf8'));
      for (const spec of specs) {
        const base = spec.split('/')[0];
        if (base !== undefined && FORBIDDEN.includes(base)) {
          violations.push(`${relative(SRC, file)} imports "${spec}"`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
