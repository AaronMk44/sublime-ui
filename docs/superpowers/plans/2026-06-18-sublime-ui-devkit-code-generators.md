# Sublime UI — Devkit Code Generators (#3) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `make:model`, `make:component`, and `theme:init` generator commands to the existing `@sublime-ui/devkit` CLI, scaffolding code that matches the locked #2 framework and #4 library conventions, located via a `sublime.config.json` (with sensible defaults).

**Architecture:** Thin commander command glue over a pure-logic `lib/generators/` module: a config loader, name/field parsers, string-template renderers, an idempotent barrel updater, and a safe file writer. Every renderer/parser is a pure function unit-tested by asserting its output string; the fs/prompt glue is exercised by temp-dir smoke tests.

**Tech Stack:** TypeScript (strict, ESM), commander (existing), `@inquirer/prompts` (interactive fields), picocolors, Node `node:fs`/`node:path`, vitest.

## Global Constraints

- **Strict TS** (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals`, `noUnusedParameters`). ESM only.
- **Package:** `@sublime-ui/devkit` (existing). Reuse its `util/log` + `util/exec`; do not duplicate.
- **Generators emit into the end-user's app**, located via `sublime.config.json` at the app root; absent keys fall back to defaults `modelsDir=src/models`, `componentsDir=src/components`, `themeDir=src/theme`, `importAlias=@sublime-ui`.
- **`make:model` emits ONE file** (the Model + `registerModel`) — per #2, `registerModel` creates the Gateway + slice at runtime. **`make:component` emits the four-file quartet** per #4. **`theme:init`** writes `tokens.json` + a typed `tokens.ts` wrapper.
- **Safety:** never overwrite an existing file without `--force`; **barrel updates are idempotent** (no duplicate lines).
- **Field type mapping:** `string`/`number`/`boolean` pass through; `X[]` → array; anything else → `string` with a printed warning.
- **Commits:** conventional-commit messages, NO Claude/AI attribution.
- **Spec:** `docs/superpowers/specs/2026-06-18-sublime-ui-devkit-code-generators-design.md`.

---

## File Structure

```
devkit/src/
  commands/
    make-model.ts        # glue (Task 10)
    make-component.ts    # glue (Task 11)
    theme-init.ts        # glue (Task 12)
  lib/generators/
    config.ts            # loadConfig (Task 2)
    names.ts             # deriveNames (Task 3)
    fields.ts            # parseFields (Task 4)
    render-model.ts      # renderModel (Task 5)
    render-component.ts  # renderComponent* (Task 6)
    render-tokens.ts     # renderTokensWrapper (Task 7)
    barrel.ts            # updateBarrel (Task 8)
    write.ts             # safeWrite (Task 9)
  cli.ts                 # register subcommands (Tasks 10–12)
  test/generators/       # vitest specs
```

---

## Task 1: Add the prompts dependency

**Files:**
- Modify: `devkit/package.json`

**Interfaces:**
- Produces: `@inquirer/prompts` available for interactive field input.

- [ ] **Step 1: Add the dependency**

In `devkit/package.json`, add to `dependencies`:
```json
    "@inquirer/prompts": "^7.0.0"
```
(keep the existing `commander`/`execa`/`picocolors`).

- [ ] **Step 2: Install + verify**

Run:
```bash
npm install
npm run typecheck -w @sublime-ui/devkit
npm run test -w @sublime-ui/devkit
```
Expected: install adds the dep; typecheck + the existing devkit suite stay green.

- [ ] **Step 3: Commit**

```bash
git add devkit/package.json package-lock.json
git commit -m "chore(devkit): add @inquirer/prompts for generator input"
```

---

## Task 2: `config.ts` — project config loader

**Files:**
- Create: `devkit/src/lib/generators/config.ts`
- Test: `devkit/test/generators/config.test.ts`

**Interfaces:**
- Produces:
  - `interface GeneratorConfig { modelsDir: string; componentsDir: string; themeDir: string; importAlias: string }`
  - `const DEFAULT_CONFIG: GeneratorConfig`
  - `loadConfig(cwd: string): GeneratorConfig` — reads `<cwd>/sublime.config.json`, shallow-merges over defaults; missing file → defaults.

- [ ] **Step 1: Write the failing test**

`devkit/test/generators/config.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig, DEFAULT_CONFIG } from '../../src/lib/generators/config.js';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'cfg-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('loadConfig', () => {
  it('returns defaults when no config file', () => {
    expect(loadConfig(dir)).toEqual(DEFAULT_CONFIG);
  });
  it('merges overrides over defaults', () => {
    writeFileSync(join(dir, 'sublime.config.json'), JSON.stringify({ modelsDir: 'app/models' }));
    const cfg = loadConfig(dir);
    expect(cfg.modelsDir).toBe('app/models');
    expect(cfg.componentsDir).toBe(DEFAULT_CONFIG.componentsDir);
  });
  it('ignores unknown keys', () => {
    writeFileSync(join(dir, 'sublime.config.json'), JSON.stringify({ nope: 1, themeDir: 'theme' }));
    const cfg = loadConfig(dir);
    expect(cfg.themeDir).toBe('theme');
    expect('nope' in cfg).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -w @sublime-ui/devkit`
Expected: FAIL — cannot resolve `config.js`.

- [ ] **Step 3: Write the implementation**

`devkit/src/lib/generators/config.ts`:
```ts
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface GeneratorConfig {
  modelsDir: string;
  componentsDir: string;
  themeDir: string;
  importAlias: string;
}

export const DEFAULT_CONFIG: GeneratorConfig = {
  modelsDir: 'src/models',
  componentsDir: 'src/components',
  themeDir: 'src/theme',
  importAlias: '@sublime-ui',
};

export function loadConfig(cwd: string): GeneratorConfig {
  const path = join(cwd, 'sublime.config.json');
  if (!existsSync(path)) return { ...DEFAULT_CONFIG };
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Partial<GeneratorConfig>;
  const result: GeneratorConfig = { ...DEFAULT_CONFIG };
  for (const key of Object.keys(DEFAULT_CONFIG) as (keyof GeneratorConfig)[]) {
    const value = raw[key];
    if (typeof value === 'string') result[key] = value;
  }
  return result;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test -w @sublime-ui/devkit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add devkit/src/lib/generators/config.ts devkit/test/generators/config.test.ts
git commit -m "feat(devkit): add generator project-config loader"
```

---

## Task 3: `names.ts` — derive class/resource/slice/file names

**Files:**
- Create: `devkit/src/lib/generators/names.ts`
- Test: `devkit/test/generators/names.test.ts`

**Interfaces:**
- Produces: `deriveNames(name: string): { className: string; resource: string; sliceName: string; fileName: string }`. `className` is PascalCase; `sliceName`/`resource` use a simple pluralizer (`y`→`ies`, `s/x/ch/sh`→`+es`, else `+s`), lowercased.

- [ ] **Step 1: Write the failing test**

`devkit/test/generators/names.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { deriveNames } from '../../src/lib/generators/names.js';

describe('deriveNames', () => {
  it('derives PascalCase class + pluralized resource/slice', () => {
    expect(deriveNames('user')).toEqual({
      className: 'User', resource: '/users', sliceName: 'users', fileName: 'User',
    });
  });
  it('handles y -> ies', () => {
    expect(deriveNames('Category').resource).toBe('/categories');
    expect(deriveNames('Category').sliceName).toBe('categories');
  });
  it('handles s/x/ch/sh -> es', () => {
    expect(deriveNames('Box').resource).toBe('/boxes');
    expect(deriveNames('dish').resource).toBe('/dishes');
  });
  it('PascalCases multi-word input', () => {
    expect(deriveNames('store-type').className).toBe('StoreType');
    expect(deriveNames('store-type').resource).toBe('/storetypes');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -w @sublime-ui/devkit`
Expected: FAIL — cannot resolve `names.js`.

- [ ] **Step 3: Write the implementation**

`devkit/src/lib/generators/names.ts`:
```ts
function pascalCase(input: string): string {
  return input
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

function pluralize(word: string): string {
  const w = word.toLowerCase();
  if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ies';
  if (/(s|x|ch|sh)$/.test(w)) return w + 'es';
  return w + 's';
}

export function deriveNames(name: string): {
  className: string;
  resource: string;
  sliceName: string;
  fileName: string;
} {
  const className = pascalCase(name);
  const plural = pluralize(className);
  return {
    className,
    resource: `/${plural}`,
    sliceName: plural,
    fileName: className,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test -w @sublime-ui/devkit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add devkit/src/lib/generators/names.ts devkit/test/generators/names.test.ts
git commit -m "feat(devkit): add name derivation (class/resource/slice/file)"
```

---

## Task 4: `fields.ts` — parse `--fields` into typed fields

**Files:**
- Create: `devkit/src/lib/generators/fields.ts`
- Test: `devkit/test/generators/fields.test.ts`

**Interfaces:**
- Produces:
  - `interface ModelField { name: string; tsType: string }`
  - `parseFields(input: string): { fields: ModelField[]; warnings: string[] }` — splits on commas, each `name:type`. `string`/`number`/`boolean` pass through; `X[]` → `X[]`; unknown scalar → `string` + a warning. Blank input → empty fields.

- [ ] **Step 1: Write the failing test**

`devkit/test/generators/fields.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { parseFields } from '../../src/lib/generators/fields.js';

describe('parseFields', () => {
  it('parses scalar types', () => {
    const { fields, warnings } = parseFields('name:string, age:number, active:boolean');
    expect(fields).toEqual([
      { name: 'name', tsType: 'string' },
      { name: 'age', tsType: 'number' },
      { name: 'active', tsType: 'boolean' },
    ]);
    expect(warnings).toEqual([]);
  });
  it('keeps array types', () => {
    expect(parseFields('tags:Tag[]').fields).toEqual([{ name: 'tags', tsType: 'Tag[]' }]);
  });
  it('defaults unknown scalar to string with a warning', () => {
    const { fields, warnings } = parseFields('ref:Widget');
    expect(fields).toEqual([{ name: 'ref', tsType: 'string' }]);
    expect(warnings[0]).toMatch(/ref.*Widget.*string/);
  });
  it('returns empty for blank input', () => {
    expect(parseFields('').fields).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -w @sublime-ui/devkit`
Expected: FAIL — cannot resolve `fields.js`.

- [ ] **Step 3: Write the implementation**

`devkit/src/lib/generators/fields.ts`:
```ts
export interface ModelField {
  name: string;
  tsType: string;
}

const SCALARS = new Set(['string', 'number', 'boolean']);

export function parseFields(input: string): {
  fields: ModelField[];
  warnings: string[];
} {
  const fields: ModelField[] = [];
  const warnings: string[] = [];
  for (const part of input.split(',')) {
    const trimmed = part.trim();
    if (trimmed === '') continue;
    const [rawName, rawType] = trimmed.split(':').map((s) => s.trim());
    if (rawName === undefined || rawName === '') continue;
    const type = rawType ?? 'string';
    if (SCALARS.has(type) || type.endsWith('[]')) {
      fields.push({ name: rawName, tsType: type });
    } else {
      warnings.push(`Unknown type "${type}" for field "${rawName}" — defaulting to string.`);
      fields.push({ name: rawName, tsType: 'string' });
    }
  }
  return { fields, warnings };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test -w @sublime-ui/devkit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add devkit/src/lib/generators/fields.ts devkit/test/generators/fields.test.ts
git commit -m "feat(devkit): add --fields parser"
```

---

## Task 5: `render-model.ts` — the Model file template

**Files:**
- Create: `devkit/src/lib/generators/render-model.ts`
- Test: `devkit/test/generators/render-model.test.ts`

**Interfaces:**
- Consumes: `ModelField` (Task 4).
- Produces: `renderModel(opts: { className: string; resource: string; fields: ModelField[]; importAlias: string }): string` — the full `src/models/<Name>.ts` content (Model + `registerModel`).

- [ ] **Step 1: Write the failing test**

`devkit/test/generators/render-model.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { renderModel } from '../../src/lib/generators/render-model.js';

describe('renderModel', () => {
  it('renders a Model with declare fields, resource, and registerModel', () => {
    const out = renderModel({
      className: 'User',
      resource: '/users',
      importAlias: '@sublime-ui',
      fields: [
        { name: 'id', tsType: 'number' },
        { name: 'name', tsType: 'string' },
      ],
    });
    expect(out).toContain("import { Model, registerModel } from '@sublime-ui/framework';");
    expect(out).toContain('export class User extends Model {');
    expect(out).toContain("protected static resource = '/users';");
    expect(out).toContain('declare id: number;');
    expect(out).toContain('declare name: string;');
    expect(out).toContain('registerModel(User);');
  });
  it('always includes an id field even when none provided', () => {
    const out = renderModel({ className: 'Tag', resource: '/tags', importAlias: '@sublime-ui', fields: [] });
    expect(out).toContain('declare id: number;');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -w @sublime-ui/devkit`
Expected: FAIL — cannot resolve `render-model.js`.

- [ ] **Step 3: Write the implementation**

`devkit/src/lib/generators/render-model.ts`:
```ts
import type { ModelField } from './fields.js';

export function renderModel(opts: {
  className: string;
  resource: string;
  fields: ModelField[];
  importAlias: string;
}): string {
  const hasId = opts.fields.some((f) => f.name === 'id');
  const fields = hasId
    ? opts.fields
    : [{ name: 'id', tsType: 'number' }, ...opts.fields];
  const declares = fields.map((f) => `  declare ${f.name}: ${f.tsType};`).join('\n');
  return `import { Model, registerModel } from '${opts.importAlias}/framework';

export class ${opts.className} extends Model {
  protected static resource = '${opts.resource}';
${declares}
}

registerModel(${opts.className});
`;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test -w @sublime-ui/devkit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add devkit/src/lib/generators/render-model.ts devkit/test/generators/render-model.test.ts
git commit -m "feat(devkit): add Model file renderer"
```

---

## Task 6: `render-component.ts` — the quartet templates

**Files:**
- Create: `devkit/src/lib/generators/render-component.ts`
- Test: `devkit/test/generators/render-component.test.ts`

**Interfaces:**
- Produces (each returns a string):
  - `renderComponentTypes(name: string): string`
  - `renderComponentWeb(name: string, mobileOnly: boolean, importAlias: string): string`
  - `renderComponentNative(name: string, importAlias: string): string`
  - `renderComponentIndex(name: string): string`

- [ ] **Step 1: Write the failing test**

`devkit/test/generators/render-component.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  renderComponentTypes, renderComponentWeb, renderComponentNative, renderComponentIndex,
} from '../../src/lib/generators/render-component.js';

describe('render-component', () => {
  it('types: shared prop interface', () => {
    const out = renderComponentTypes('Card');
    expect(out).toContain('export interface CardProps {');
    expect(out).toContain('children');
  });
  it('web: MUI impl importing useTokens', () => {
    const out = renderComponentWeb('Card', false, '@sublime-ui');
    expect(out).toContain("from '@sublime-ui/library'");
    expect(out).toContain('export function Card(');
    expect(out).toContain('CardProps');
  });
  it('web stub when mobile-only', () => {
    const out = renderComponentWeb('Drawer', true, '@sublime-ui');
    expect(out).toContain('mobile-only');
    expect(out).toContain('return null');
  });
  it('native: Paper impl', () => {
    const out = renderComponentNative('Card', '@sublime-ui');
    expect(out).toContain('export function Card(');
  });
  it('index re-exports component + props type', () => {
    const out = renderComponentIndex('Card');
    expect(out).toContain("export { Card } from './Card.js';");
    expect(out).toContain("export type { CardProps } from './Card.types.js';");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -w @sublime-ui/devkit`
Expected: FAIL — cannot resolve `render-component.js`.

- [ ] **Step 3: Write the implementation**

`devkit/src/lib/generators/render-component.ts`:
```ts
export function renderComponentTypes(name: string): string {
  return `import type { ReactNode } from 'react';

export type Variant = 'solid' | 'soft' | 'outline' | 'ghost';
export type Tone = 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';
export type Size = 'sm' | 'md' | 'lg';

export interface ${name}Props {
  children?: ReactNode;
  variant?: Variant;
  tone?: Tone;
  size?: Size;
  testID?: string;
}
`;
}

export function renderComponentWeb(name: string, mobileOnly: boolean, importAlias: string): string {
  if (mobileOnly) {
    return `import type { ${name}Props } from './${name}.types.js';

/** ${name} is mobile-only and renders nothing on web. */
export function ${name}(_props: ${name}Props) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('${name} is mobile-only and renders nothing on web.');
  }
  return null;
}
`;
  }
  return `import { Box } from '@mui/material';
import { useTokens } from '${importAlias}/library';
import type { ${name}Props } from './${name}.types.js';

export function ${name}({ children, testID }: ${name}Props) {
  const tokens = useTokens();
  return (
    <Box data-testid={testID} sx={{ borderRadius: \`\${tokens.radii.md}px\` }}>
      {children}
    </Box>
  );
}
`;
}

export function renderComponentNative(name: string, importAlias: string): string {
  return `import { View } from 'react-native';
import { useTokens } from '${importAlias}/library';
import type { ${name}Props } from './${name}.types.js';

export function ${name}({ children, testID }: ${name}Props) {
  const tokens = useTokens();
  return (
    <View testID={testID} style={{ borderRadius: tokens.radii.md }}>
      {children}
    </View>
  );
}
`;
}

export function renderComponentIndex(name: string): string {
  return `export { ${name} } from './${name}.js';
export type { ${name}Props } from './${name}.types.js';
`;
}
```

> Note: the generated web/native bodies are minimal glass-styled scaffolds the developer fills in (they reference `useTokens` from `@sublime-ui/library`). This mirrors #4's recipe shape without prescribing each component's MUI/Paper base.

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test -w @sublime-ui/devkit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add devkit/src/lib/generators/render-component.ts devkit/test/generators/render-component.test.ts
git commit -m "feat(devkit): add component quartet renderers"
```

---

## Task 7: `render-tokens.ts` — the typed `tokens.ts` wrapper

**Files:**
- Create: `devkit/src/lib/generators/render-tokens.ts`
- Test: `devkit/test/generators/render-tokens.test.ts`

**Interfaces:**
- Produces: `renderTokensWrapper(importAlias: string): string` — the `tokens.ts` content that imports `tokens.json` and casts to `SublimeTokens`.

- [ ] **Step 1: Write the failing test**

`devkit/test/generators/render-tokens.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { renderTokensWrapper } from '../../src/lib/generators/render-tokens.js';

describe('renderTokensWrapper', () => {
  it('imports the json and casts to SublimeTokens', () => {
    const out = renderTokensWrapper('@sublime-ui');
    expect(out).toContain("import data from './tokens.json'");
    expect(out).toContain("import type { SublimeTokens } from '@sublime-ui/library'");
    expect(out).toContain('export const tokens = data as SublimeTokens;');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -w @sublime-ui/devkit`
Expected: FAIL — cannot resolve `render-tokens.js`.

- [ ] **Step 3: Write the implementation**

`devkit/src/lib/generators/render-tokens.ts`:
```ts
export function renderTokensWrapper(importAlias: string): string {
  return `import data from './tokens.json';
import type { SublimeTokens } from '${importAlias}/library';

/** App design tokens. Edit tokens.json (the devkit-server customizer writes here). */
export const tokens = data as SublimeTokens;
`;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test -w @sublime-ui/devkit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add devkit/src/lib/generators/render-tokens.ts devkit/test/generators/render-tokens.test.ts
git commit -m "feat(devkit): add tokens.ts wrapper renderer"
```

---

## Task 8: `barrel.ts` — idempotent barrel updater

**Files:**
- Create: `devkit/src/lib/generators/barrel.ts`
- Test: `devkit/test/generators/barrel.test.ts`

**Interfaces:**
- Produces: `updateBarrel(existing: string, line: string): string` — returns `existing` with `line` appended (newline-terminated) only if not already present; preserves existing content/order.

- [ ] **Step 1: Write the failing test**

`devkit/test/generators/barrel.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { updateBarrel } from '../../src/lib/generators/barrel.js';

describe('updateBarrel', () => {
  it('appends a new line', () => {
    expect(updateBarrel("export * from './A.js';\n", "export * from './B.js';"))
      .toBe("export * from './A.js';\nexport * from './B.js';\n");
  });
  it('is idempotent — does not duplicate', () => {
    const start = "export * from './A.js';\n";
    expect(updateBarrel(start, "export * from './A.js';")).toBe(start);
  });
  it('handles empty existing content', () => {
    expect(updateBarrel('', "export * from './A.js';")).toBe("export * from './A.js';\n");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -w @sublime-ui/devkit`
Expected: FAIL — cannot resolve `barrel.js`.

- [ ] **Step 3: Write the implementation**

`devkit/src/lib/generators/barrel.ts`:
```ts
export function updateBarrel(existing: string, line: string): string {
  const lines = existing.split('\n').map((l) => l.trim());
  if (lines.includes(line.trim())) return existing;
  const base = existing.length > 0 && !existing.endsWith('\n') ? existing + '\n' : existing;
  return `${base}${line}\n`;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test -w @sublime-ui/devkit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add devkit/src/lib/generators/barrel.ts devkit/test/generators/barrel.test.ts
git commit -m "feat(devkit): add idempotent barrel updater"
```

---

## Task 9: `write.ts` — safe file writer

**Files:**
- Create: `devkit/src/lib/generators/write.ts`
- Test: `devkit/test/generators/write.test.ts`

**Interfaces:**
- Produces:
  - `class FileExistsError extends Error { readonly path: string }`
  - `safeWrite(path: string, content: string, force: boolean): void` — `mkdir -p` the parent, write the file; if it exists and `!force`, throw `FileExistsError`.

- [ ] **Step 1: Write the failing test**

`devkit/test/generators/write.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { safeWrite, FileExistsError } from '../../src/lib/generators/write.js';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'w-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('safeWrite', () => {
  it('creates parent dirs and writes', () => {
    const p = join(dir, 'a/b/c.ts');
    safeWrite(p, 'hello', false);
    expect(existsSync(p)).toBe(true);
    expect(readFileSync(p, 'utf8')).toBe('hello');
  });
  it('refuses to overwrite without force', () => {
    const p = join(dir, 'x.ts');
    safeWrite(p, 'one', false);
    expect(() => safeWrite(p, 'two', false)).toThrow(FileExistsError);
    expect(readFileSync(p, 'utf8')).toBe('one');
  });
  it('overwrites with force', () => {
    const p = join(dir, 'x.ts');
    safeWrite(p, 'one', false);
    safeWrite(p, 'two', true);
    expect(readFileSync(p, 'utf8')).toBe('two');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -w @sublime-ui/devkit`
Expected: FAIL — cannot resolve `write.js`.

- [ ] **Step 3: Write the implementation**

`devkit/src/lib/generators/write.ts`:
```ts
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export class FileExistsError extends Error {
  readonly path: string;
  constructor(path: string) {
    super(`File already exists: ${path} (use --force to overwrite)`);
    this.name = 'FileExistsError';
    this.path = path;
    Object.setPrototypeOf(this, FileExistsError.prototype);
  }
}

export function safeWrite(path: string, content: string, force: boolean): void {
  if (existsSync(path) && !force) throw new FileExistsError(path);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test -w @sublime-ui/devkit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add devkit/src/lib/generators/write.ts devkit/test/generators/write.test.ts
git commit -m "feat(devkit): add safe file writer"
```

---

## Task 10: `make:model` command + CLI wiring

**Files:**
- Create: `devkit/src/commands/make-model.ts`
- Modify: `devkit/src/cli.ts`
- Test: `devkit/test/generators/make-model.test.ts`

**Interfaces:**
- Consumes: `loadConfig` (T2), `deriveNames` (T3), `parseFields` (T4), `renderModel` (T5), `updateBarrel` (T8), `safeWrite` (T9), `log` (existing).
- Produces: `makeModel(opts: { name: string; cwd: string; fields?: string; resource?: string; force: boolean; promptFields?: () => Promise<string> }): Promise<number>` — generates the model file + updates the barrel; returns exit code. `promptFields` is injectable so the interactive path is testable.

- [ ] **Step 1: Write the failing test**

`devkit/test/generators/make-model.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeModel } from '../../src/commands/make-model.js';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'mm-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('makeModel', () => {
  it('writes the model file and updates the barrel', async () => {
    const code = await makeModel({ name: 'User', cwd: dir, fields: 'name:string', force: false });
    expect(code).toBe(0);
    const model = readFileSync(join(dir, 'src/models/User.ts'), 'utf8');
    expect(model).toContain('export class User extends Model {');
    expect(model).toContain('declare name: string;');
    expect(model).toContain('registerModel(User);');
    const barrel = readFileSync(join(dir, 'src/models/index.ts'), 'utf8');
    expect(barrel).toContain("export * from './User.js';");
  });
  it('uses interactive fields when --fields omitted', async () => {
    const code = await makeModel({ name: 'Tag', cwd: dir, force: false, promptFields: async () => 'label:string' });
    expect(code).toBe(0);
    expect(readFileSync(join(dir, 'src/models/Tag.ts'), 'utf8')).toContain('declare label: string;');
  });
  it('refuses to overwrite without --force', async () => {
    await makeModel({ name: 'User', cwd: dir, fields: 'a:string', force: false });
    const code = await makeModel({ name: 'User', cwd: dir, fields: 'b:string', force: false });
    expect(code).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -w @sublime-ui/devkit`
Expected: FAIL — cannot resolve `make-model.js`.

- [ ] **Step 3: Write `make-model.ts`**

`devkit/src/commands/make-model.ts`:
```ts
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
```

- [ ] **Step 4: Wire into `cli.ts`** (add before `program.parseAsync`)

```ts
import { input } from '@inquirer/prompts';
import { makeModel } from './commands/make-model.js';

program
  .command('make:model <name>')
  .description('Scaffold a Model (+ registerModel) for the framework')
  .option('--fields <spec>', 'fields, e.g. "name:string, tags:Tag[]"')
  .option('--resource <path>', 'override the REST resource path')
  .option('--force', 'overwrite existing files')
  .action(async (name: string, opts: { fields?: string; resource?: string; force?: boolean }) => {
    const code = await makeModel({
      name,
      cwd: process.cwd(),
      force: opts.force ?? false,
      ...(opts.fields ? { fields: opts.fields } : {}),
      ...(opts.resource ? { resource: opts.resource } : {}),
      promptFields: () =>
        input({ message: 'Fields (name:type, comma-separated; blank for id-only):', default: '' }),
    });
    process.exit(code);
  });
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm run test -w @sublime-ui/devkit && npm run typecheck -w @sublime-ui/devkit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add devkit/src/commands/make-model.ts devkit/src/cli.ts devkit/test/generators/make-model.test.ts
git commit -m "feat(devkit): add make:model command"
```

---

## Task 11: `make:component` command + CLI wiring

**Files:**
- Create: `devkit/src/commands/make-component.ts`
- Modify: `devkit/src/cli.ts`
- Test: `devkit/test/generators/make-component.test.ts`

**Interfaces:**
- Consumes: `loadConfig` (T2), the `renderComponent*` renderers (T6), `updateBarrel` (T8), `safeWrite` (T9), `log`.
- Produces: `makeComponent(opts: { name: string; cwd: string; mobileOnly: boolean; force: boolean }): Promise<number>` — writes the quartet + updates the components barrel.

- [ ] **Step 1: Write the failing test**

`devkit/test/generators/make-component.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeComponent } from '../../src/commands/make-component.js';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'mc-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('makeComponent', () => {
  it('writes the four-file quartet and updates the barrel', async () => {
    const code = await makeComponent({ name: 'Card', cwd: dir, mobileOnly: false, force: false });
    expect(code).toBe(0);
    const base = join(dir, 'src/components/Card');
    expect(existsSync(join(base, 'Card.types.ts'))).toBe(true);
    expect(existsSync(join(base, 'Card.tsx'))).toBe(true);
    expect(existsSync(join(base, 'Card.native.tsx'))).toBe(true);
    expect(existsSync(join(base, 'index.ts'))).toBe(true);
    expect(readFileSync(join(dir, 'src/components/index.ts'), 'utf8')).toContain("export * from './Card/index.js';");
  });
  it('mobile-only writes a web stub', async () => {
    await makeComponent({ name: 'Drawer', cwd: dir, mobileOnly: true, force: false });
    expect(readFileSync(join(dir, 'src/components/Drawer/Drawer.tsx'), 'utf8')).toContain('mobile-only');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -w @sublime-ui/devkit`
Expected: FAIL — cannot resolve `make-component.js`.

- [ ] **Step 3: Write `make-component.ts`**

`devkit/src/commands/make-component.ts`:
```ts
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
```

- [ ] **Step 4: Wire into `cli.ts`**

```ts
import { makeComponent } from './commands/make-component.js';

program
  .command('make:component <name>')
  .description('Scaffold a cross-platform component (types + web + native + index)')
  .option('--mobile-only', 'mobile-only component (web renders a null stub)')
  .option('--force', 'overwrite existing files')
  .action(async (name: string, opts: { mobileOnly?: boolean; force?: boolean }) => {
    process.exit(await makeComponent({
      name, cwd: process.cwd(), mobileOnly: opts.mobileOnly ?? false, force: opts.force ?? false,
    }));
  });
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm run test -w @sublime-ui/devkit && npm run typecheck -w @sublime-ui/devkit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add devkit/src/commands/make-component.ts devkit/src/cli.ts devkit/test/generators/make-component.test.ts
git commit -m "feat(devkit): add make:component command"
```

---

## Task 12: `theme:init` command + CLI wiring

**Files:**
- Create: `devkit/src/commands/theme-init.ts`
- Modify: `devkit/src/cli.ts`
- Test: `devkit/test/generators/theme-init.test.ts`

**Interfaces:**
- Consumes: `loadConfig` (T2), `renderTokensWrapper` (T7), `safeWrite` (T9), `log`.
- Produces: `themeInit(opts: { cwd: string; force: boolean; loadDefaultTokens?: () => Promise<unknown> }): Promise<number>` — writes `<themeDir>/tokens.json` (= the resolved `defaultTokens`) + `<themeDir>/tokens.ts`. `loadDefaultTokens` is injectable so the test supplies tokens without a real installed library; the default implementation resolves `@sublime-ui/library`'s built `dist/tokens/tokens.js` from the app's `node_modules` and reads `defaultTokens`.

- [ ] **Step 1: Write the failing test**

`devkit/test/generators/theme-init.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { themeInit } from '../../src/commands/theme-init.js';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'ti-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('themeInit', () => {
  it('writes tokens.json and a typed tokens.ts wrapper', async () => {
    const fake = { color: { light: { primary: '#000' } }, radii: { md: 12 } };
    const code = await themeInit({ cwd: dir, force: false, loadDefaultTokens: async () => fake });
    expect(code).toBe(0);
    const jsonPath = join(dir, 'src/theme/tokens.json');
    expect(existsSync(jsonPath)).toBe(true);
    expect(JSON.parse(readFileSync(jsonPath, 'utf8'))).toEqual(fake);
    const wrapper = readFileSync(join(dir, 'src/theme/tokens.ts'), 'utf8');
    expect(wrapper).toContain("import data from './tokens.json'");
    expect(wrapper).toContain('export const tokens = data as SublimeTokens;');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -w @sublime-ui/devkit`
Expected: FAIL — cannot resolve `theme-init.js`.

- [ ] **Step 3: Write `theme-init.ts`**

`devkit/src/commands/theme-init.ts`:
```ts
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { loadConfig } from '../lib/generators/config.js';
import { renderTokensWrapper } from '../lib/generators/render-tokens.js';
import { safeWrite, FileExistsError } from '../lib/generators/write.js';
import { log } from '../util/log.js';

/** Resolves the app's installed @sublime-ui/library and reads its defaultTokens. */
async function resolveDefaultTokens(cwd: string): Promise<unknown> {
  const require = createRequire(join(cwd, 'noop.js'));
  const pkgJson = require.resolve('@sublime-ui/library/package.json');
  const tokensJs = join(dirname(pkgJson), 'dist', 'tokens', 'tokens.js');
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
```

- [ ] **Step 4: Wire into `cli.ts`**

```ts
import { themeInit } from './commands/theme-init.js';

program
  .command('theme:init')
  .description('Scaffold the app design tokens (tokens.json + typed wrapper)')
  .option('--force', 'overwrite existing files')
  .action(async (opts: { force?: boolean }) => {
    process.exit(await themeInit({ cwd: process.cwd(), force: opts.force ?? false }));
  });
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm run test -w @sublime-ui/devkit && npm run typecheck -w @sublime-ui/devkit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add devkit/src/commands/theme-init.ts devkit/src/cli.ts devkit/test/generators/theme-init.test.ts
git commit -m "feat(devkit): add theme:init command"
```

---

## Task 13: Build, docs, full gate

**Files:**
- Modify: `devkit/README.md`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: documented generator commands + a verified build.

- [ ] **Step 1: Build the CLI and smoke the new commands**

Run:
```bash
npm run build -w @sublime-ui/devkit
node devkit/dist/cli.js --help
```
Expected: `dist/cli.js` builds; `--help` lists `make:model`, `make:component`, `theme:init` alongside `doctor/setup/build/run`.

- [ ] **Step 2: Update `devkit/README.md`** — add a "Code generators" section

Append:
```markdown
## Code generators

Scaffold code matching the Sublime UI framework/library conventions. Paths come
from `sublime.config.json` (defaults: `src/models`, `src/components`, `src/theme`).

| Command | Generates |
|---|---|
| `sublime make:model <Name> [--fields "a:string,b:number"] [--resource /path] [--force]` | `models/<Name>.ts` (Model + `declare` fields + `registerModel`) + barrel. No `--fields` → interactive prompts. |
| `sublime make:component <Name> [--mobile-only] [--force]` | `components/<Name>/` quartet (`types`/`tsx`/`native.tsx`/`index`) + barrel. `--mobile-only` → web null stub. |
| `sublime theme:init [--force]` | `theme/tokens.json` (= library defaults) + a typed `theme/tokens.ts` wrapper. |

Generators never overwrite without `--force`; barrel updates are idempotent.
```

- [ ] **Step 3: Full monorepo gate**

Run:
```bash
npm run typecheck && npm run lint && npm run test && npm run build
```
Expected: all green; the devkit suite includes the new generator tests.

- [ ] **Step 4: Commit**

```bash
git add devkit/README.md
git commit -m "docs(devkit): document make:model / make:component / theme:init"
```

---

## Self-Review notes (author)

- **Spec coverage:** project config + defaults (T2); `make:model` one-file + fields C + barrel (T3,T4,T5,T8,T9,T10); `make:component` quartet + mobile-only stub + barrel (T6,T10... T11); `theme:init` tokens.json + wrapper (T7,T12); safety/idempotency (T8,T9); prompts dep (T1); pure-logic TDD + smoke (every task) + docs (T13). Storage-agnostic Gateway + customizer correctly out of scope (forward-compatible: generated Model file unchanged).
- **theme:init token resolution:** the default path resolves `@sublime-ui/library`'s built `dist/tokens/tokens.js` (a standalone pure-data module, since #4's tsup uses `bundle:false`) from the app's node_modules — no static devkit→library dependency and no Paper/MUI load. The test injects `loadDefaultTokens` to avoid needing a real install. **Known coupling:** depends on #4's `dist/tokens/tokens.js` path; if #4's build layout changes, update the resolver (a future `@sublime-ui/library/tokens` subpath export would harden this).
- **Type consistency:** `GeneratorConfig` (modelsDir/componentsDir/themeDir/importAlias) consumed identically across commands; `ModelField` shared by `fields`/`render-model`; `FileExistsError` thrown by `safeWrite` and caught in all three commands; `deriveNames` return shape used by `make-model`.
- **No placeholders:** every code step has complete code; commands are injectable (`promptFields`, `loadDefaultTokens`) so the glue is unit-tested without real prompts/installs.
