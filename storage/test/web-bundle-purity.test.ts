// storage/test/web-bundle-purity.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

/** Native SQLite modules that must never enter the web bundle path. */
const FORBIDDEN = ['better-sqlite3', 'expo-sqlite'];

/**
 * Static `import ... from 'mod'` / bare `import 'mod'` specifiers (NOT dynamic
 * `import()` — mobile.ts legitimately reaches expo-sqlite via dynamic import).
 *
 * The `import ... from` span excludes `;` and quote chars so a bare
 * `import 'better-sqlite3';` cannot be swallowed by a *later* line's `from`
 * clause (a naive `import[\s\S]*?from` lazily spans across statements and
 * silently misses the bare native import this guard exists to catch).
 */
function staticImportsOf(source: string): string[] {
  const specs: string[] = [];
  const re =
    /(?:^|\n)\s*import\b[^;'"]*?\bfrom\s*['"]([^'"]+)['"]|(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) specs.push((m[1] ?? m[2])!);
  return specs;
}

describe('storage web-bundle purity — no static native SQLite import in the web path', () => {
  const webFiles = ['web.ts', 'createDatabaseAdapter.web.ts'];

  for (const file of webFiles) {
    it(`${file} statically imports no better-sqlite3 / expo-sqlite`, () => {
      const specs = staticImportsOf(readFileSync(join(SRC, file), 'utf8'));
      const offenders = specs.filter((s) => FORBIDDEN.includes(s.split('/')[0]!));
      expect(offenders).toEqual([]);
    });
  }
});
