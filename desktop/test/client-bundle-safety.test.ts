import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Bundle-safety guard for the renderer entry.
 *
 * The renderer must NEVER pull `node:*` or `electron` into its graph. We assert
 * this statically by walking the `import` specifiers reachable from
 * `src/client.ts` (the renderer-safe barrel) and from the `use-native` chain,
 * and failing if any of them references a node builtin or electron.
 */

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolvePath(here, '../src');

const FORBIDDEN = /(^|['"])(node:|electron($|\/|['"]))/;

function importSpecifiers(code: string): string[] {
  const specs: string[] = [];
  const re =
    /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    const spec = m[1] ?? m[2];
    if (spec !== undefined) specs.push(spec);
  }
  return specs;
}

function resolveLocal(fromFile: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const base = resolvePath(dirname(fromFile), spec);
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    resolvePath(base, 'index.ts'),
  ]) {
    try {
      readFileSync(candidate, 'utf8');
      return candidate;
    } catch {
      /* try next */
    }
  }
  return null;
}

/** Returns every external (non-relative) specifier reachable from `entry`. */
function reachableExternals(entry: string): string[] {
  const seen = new Set<string>();
  const externals = new Set<string>();
  const stack = [entry];
  while (stack.length > 0) {
    const file = stack.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    const code = readFileSync(file, 'utf8');
    for (const spec of importSpecifiers(code)) {
      if (spec.startsWith('.')) {
        const local = resolveLocal(file, spec);
        if (local !== null) stack.push(local);
      } else {
        externals.add(spec);
      }
    }
  }
  return [...externals];
}

describe('renderer bundle safety', () => {
  it('the ./client barrel pulls in no node:* or electron specifiers', () => {
    const externals = reachableExternals(resolvePath(srcDir, 'client.ts'));
    const offenders = externals.filter((s) => FORBIDDEN.test(s));
    expect(offenders).toEqual([]);
  });

  it('the use-native chain pulls in no node:* or electron specifiers', () => {
    const externals = reachableExternals(resolvePath(srcDir, 'use-native.ts'));
    const offenders = externals.filter((s) => FORBIDDEN.test(s));
    expect(offenders).toEqual([]);
  });
});
