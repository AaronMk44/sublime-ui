# Sublime UI — Monorepo Foundation + Devkit Offline Android Build — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the `@sublime-ui/*` npm-workspaces monorepo and ship its first working package — the `@sublime-ui/devkit` CLI that builds a signed, standalone Android APK fully offline (no cloud build), self-healing missing NDK/CMake.

**Architecture:** A three-package npm-workspaces monorepo (`framework`, `library`, `devkit`) with shared strict-TypeScript config, tsup builds, and vitest. The devkit is a commander-based CLI (`sublime` / `sui`) whose offline-build logic is split into **pure, TDD-tested modules** (version requirements, env detection, Gradle-error parsing, doctor report model) and **thin system-mutating glue** (portable JDK fetch, sdkmanager install/validate, scoped-env Gradle runner, adb) that the end-to-end smoke test exercises against `sandbox/DemoApp`.

**Tech Stack:** TypeScript 5 (strict, ESM), tsup, vitest, ESLint + Prettier, commander, execa, picocolors, Node ≥18 (developed on 24). Android: JDK 17 (scoped), Android cmdline-tools `sdkmanager`, Gradle (via Expo prebuild), NDK r27b (27.1.12297006), CMake 3.22.1.

## Global Constraints

- **Node ≥ 18** runtime floor; developed on Node 24.16.0. ESM only (`"type": "module"`).
- **TypeScript strict everywhere:** `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `exactOptionalPropertyTypes: true`.
- **Scope/naming:** packages are `@sublime-ui/framework`, `@sublime-ui/library`, `@sublime-ui/devkit`, all `version 0.0.0`, all `"type": "module"`. CLI bin names: **`sublime`** with alias **`sui`**.
- **Workspaces** = `framework`, `library`, `devkit`. `sandbox/` is **NOT** a workspace.
- **Android-only** build scope (iOS needs macOS). "Offline" = no cloud build service + offline runtime; first Gradle build may still fetch Maven/AGP.
- **Pinned Android toolchain:** NDK `27.1.12297006`, CMake `3.22.1`, JDK 17 (scoped via per-process `JAVA_HOME`; system Java never modified). Default build target = `assembleRelease`.
- **Commits:** conventional-commit style messages. **Never** add Claude attribution / `Co-Authored-By` trailers / "Generated with" footers.
- Smoke-test fixture is `sandbox/DemoApp` (package id `com.demo.demoapp`).

---

## File Structure

```
Sublime/
  package.json                 # root: workspaces, fan-out scripts (Task 1)
  tsconfig.base.json           # shared strict TS (Task 1)
  tsconfig.json                # root solution refs / typecheck entry (Task 1)
  .eslintrc.cjs                # shared lint (Task 1)
  .prettierrc.json             # shared format (Task 1)
  .gitignore                   # already present
  framework/
    package.json  tsconfig.json  tsup.config.ts  src/index.ts  (Task 2)
  library/
    package.json  tsconfig.json  tsup.config.ts  src/index.ts  (Task 2)
  devkit/
    package.json  tsconfig.json  tsup.config.ts
    src/
      cli.ts                   # commander root (Task 13)
      commands/
        doctor.ts setup.ts build.ts run.ts   (Tasks 8, 11, 12)
      lib/
        requirements.ts        # version source-of-truth + checks (Task 3)
        detect.ts              # env probe parsers (Task 4)
        gradle.ts              # missing-component parser + scoped runner (Tasks 5, 10)
        doctor-report.ts       # pure report model (Task 7)
        sdkmanager.ts          # cmdline-tools bootstrap + install/validate (Task 9)
        jdk.ts                 # portable JDK 17 fetch/cache (Task 9)
        android.ts             # adb device list/install/launch (Task 11)
      util/
        exec.ts                # execa wrapper (Task 6)
        log.ts                 # table/spinner/colored output (Task 6)
    test/                      # vitest specs (per task)
    README.md                  # CLI reference (Task 14)
  README.md                    # monorepo overview (Task 14)
```

---

## Task 1: Monorepo root configuration

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `tsconfig.json`
- Create: `.eslintrc.cjs`
- Create: `.prettierrc.json`

**Interfaces:**
- Consumes: nothing.
- Produces: root npm scripts `build`, `typecheck`, `test`, `lint`, `format` that fan out across workspaces; `tsconfig.base.json` with the strict flags every package `tsconfig.json` extends.

- [ ] **Step 1: Create the root `package.json`**

`package.json`:
```json
{
  "name": "sublime-ui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=18" },
  "workspaces": ["framework", "library", "devkit"],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "lint": "eslint . --max-warnings=0",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^9.0.0",
    "eslint-config-prettier": "^9.1.0",
    "prettier": "^3.3.0",
    "tsup": "^8.3.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.base.json`**

`tsconfig.base.json`:
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "sourceMap": true,
    "verbatimModuleSyntax": true
  }
}
```

- [ ] **Step 3: Create root `tsconfig.json`**

`tsconfig.json`:
```json
{
  "extends": "./tsconfig.base.json",
  "include": [],
  "references": [
    { "path": "./framework" },
    { "path": "./library" },
    { "path": "./devkit" }
  ]
}
```

- [ ] **Step 4: Create `.eslintrc.cjs`**

`.eslintrc.cjs`:
```cjs
/* eslint-env node */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  ignorePatterns: ['dist/', 'node_modules/', 'sandbox/', '*.cjs'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
```

- [ ] **Step 5: Create `.prettierrc.json`**

`.prettierrc.json`:
```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 80
}
```

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.base.json tsconfig.json .eslintrc.cjs .prettierrc.json
git commit -m "chore: add monorepo root config (workspaces, strict TS, lint, format)"
```

---

## Task 2: Three workspace package skeletons

**Files:**
- Create: `framework/package.json`, `framework/tsconfig.json`, `framework/tsup.config.ts`, `framework/src/index.ts`
- Create: `library/package.json`, `library/tsconfig.json`, `library/tsup.config.ts`, `library/src/index.ts`
- Create: `devkit/package.json`, `devkit/tsconfig.json`, `devkit/tsup.config.ts`
- Delete: `framework/.gitkeep`, `library/.gitkeep`, `devkit/.gitkeep`

**Interfaces:**
- Consumes: `tsconfig.base.json` from Task 1.
- Produces: three installable workspaces; `framework` and `library` export a `version` const; `devkit` declares `bin: { sublime, sui }` pointing at `dist/cli.js` (built in later tasks).

- [ ] **Step 1: Create `framework` package files**

`framework/package.json`:
```json
{
  "name": "@sublime-ui/framework",
  "version": "0.0.0",
  "type": "module",
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "lint": "eslint src"
  }
}
```

`framework/tsconfig.json`:
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

`framework/tsup.config.ts`:
```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
});
```

`framework/src/index.ts`:
```ts
export const version = '0.0.0';
```

- [ ] **Step 2: Create `library` package files** (identical shape, swap the name)

`library/package.json`:
```json
{
  "name": "@sublime-ui/library",
  "version": "0.0.0",
  "type": "module",
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "lint": "eslint src"
  }
}
```

`library/tsconfig.json`:
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

`library/tsup.config.ts`:
```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
});
```

`library/src/index.ts`:
```ts
export const version = '0.0.0';
```

- [ ] **Step 3: Create `devkit` package files** (no `src/` yet beyond what later tasks add)

`devkit/package.json`:
```json
{
  "name": "@sublime-ui/devkit",
  "version": "0.0.0",
  "type": "module",
  "bin": { "sublime": "./dist/cli.js", "sui": "./dist/cli.js" },
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "lint": "eslint src"
  },
  "dependencies": {
    "commander": "^12.1.0",
    "execa": "^9.4.0",
    "picocolors": "^1.1.0"
  }
}
```

`devkit/tsconfig.json`:
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src", "test"]
}
```

`devkit/tsup.config.ts`:
```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts', 'src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  banner: { js: '#!/usr/bin/env node' },
});
```

- [ ] **Step 4: Add devkit barrel entry so `index.ts` exists for tsup**

`devkit/src/index.ts`:
```ts
export const version = '0.0.0';
```

- [ ] **Step 5: Remove `.gitkeep` placeholders**

```bash
rm framework/.gitkeep library/.gitkeep devkit/.gitkeep
```

- [ ] **Step 6: Install and verify the monorepo wires up**

Run:
```bash
npm install
npm run typecheck
npm run lint
```
Expected: install creates a single root `node_modules` with the three workspaces symlinked; `typecheck` and `lint` exit 0. (`build`/`test` are exercised once devkit has real code; `framework`/`library` build to `dist` cleanly.)

- [ ] **Step 7: Verify build produces dist output**

Run:
```bash
npm run build
ls framework/dist library/dist
```
Expected: each `dist/` contains `index.js` + `index.d.ts`.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json framework library devkit
git commit -m "feat: scaffold framework, library, and devkit workspaces"
```

---

## Task 3: `requirements.ts` — version source-of-truth + satisfaction checks (pure, TDD)

**Files:**
- Create: `devkit/src/lib/requirements.ts`
- Test: `devkit/test/requirements.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `REQUIREMENTS` const: `{ node: { min: 18 }, jdk: { major: 17 }, ndk: '27.1.12297006', cmake: '3.22.1', buildTools: '35.0.0', platform: 'android-35' }`.
  - `JDK_DOWNLOAD`: `{ windowsX64: string }` (Adoptium Temurin 17 zip URL).
  - `CMDLINE_TOOLS_URL`: `{ windows: string }`.
  - `satisfiesMajor(actual: string | null, requiredMajor: number): boolean` — true if `actual`'s leading integer ≥ `requiredMajor`.
  - `satisfiesExact(actual: string | null, required: string): boolean` — exact string equality, `null` → false.

- [ ] **Step 1: Write the failing test**

`devkit/test/requirements.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  REQUIREMENTS,
  satisfiesMajor,
  satisfiesExact,
} from '../src/lib/requirements.js';

describe('REQUIREMENTS', () => {
  it('pins the proven Android toolchain versions', () => {
    expect(REQUIREMENTS.ndk).toBe('27.1.12297006');
    expect(REQUIREMENTS.cmake).toBe('3.22.1');
    expect(REQUIREMENTS.jdk.major).toBe(17);
    expect(REQUIREMENTS.node.min).toBe(18);
  });
});

describe('satisfiesMajor', () => {
  it('passes when the actual major meets or exceeds the floor', () => {
    expect(satisfiesMajor('17.0.9', 17)).toBe(true);
    expect(satisfiesMajor('21', 17)).toBe(true);
    expect(satisfiesMajor('v24.16.0', 18)).toBe(true);
  });
  it('fails below the floor or when unknown', () => {
    expect(satisfiesMajor('1.8.0_202', 17)).toBe(false);
    expect(satisfiesMajor(null, 17)).toBe(false);
    expect(satisfiesMajor('not-a-version', 17)).toBe(false);
  });
});

describe('satisfiesExact', () => {
  it('requires an exact match', () => {
    expect(satisfiesExact('3.22.1', '3.22.1')).toBe(true);
    expect(satisfiesExact('3.22.0', '3.22.1')).toBe(false);
    expect(satisfiesExact(null, '3.22.1')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @sublime-ui/devkit`
Expected: FAIL — cannot resolve `../src/lib/requirements.js`.

- [ ] **Step 3: Write the implementation**

`devkit/src/lib/requirements.ts`:
```ts
export const REQUIREMENTS = {
  node: { min: 18 },
  jdk: { major: 17 },
  ndk: '27.1.12297006',
  cmake: '3.22.1',
  buildTools: '35.0.0',
  platform: 'android-35',
} as const;

export const JDK_DOWNLOAD = {
  windowsX64:
    'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.13%2B11/OpenJDK17U-jdk_x64_windows_hotspot_17.0.13_11.zip',
} as const;

export const CMDLINE_TOOLS_URL = {
  windows:
    'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip',
} as const;

/** Leading integer of a version string, or null if none. */
function leadingMajor(actual: string | null): number | null {
  if (actual === null) return null;
  const match = actual.match(/\d+/);
  if (match === null) return null;
  return Number.parseInt(match[0], 10);
}

export function satisfiesMajor(
  actual: string | null,
  requiredMajor: number,
): boolean {
  const major = leadingMajor(actual);
  return major !== null && major >= requiredMajor;
}

export function satisfiesExact(
  actual: string | null,
  required: string,
): boolean {
  return actual !== null && actual === required;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w @sublime-ui/devkit`
Expected: PASS (all `requirements` specs green).

- [ ] **Step 5: Commit**

```bash
git add devkit/src/lib/requirements.ts devkit/test/requirements.test.ts
git commit -m "feat(devkit): add requirements source-of-truth and version checks"
```

---

## Task 4: `detect.ts` — env-probe output parsers (pure, TDD)

**Files:**
- Create: `devkit/src/lib/detect.ts`
- Test: `devkit/test/detect.test.ts`

**Interfaces:**
- Consumes: nothing (operates on raw command-output strings).
- Produces:
  - `parseJavaVersion(stderr: string): string | null` — Java prints version to **stderr**; returns e.g. `'17.0.13'` or `'1.8.0_202'`.
  - `parseAdbVersion(stdout: string): string | null` — e.g. `'1.0.41'`.
  - `parseSdkmanagerInstalled(stdout: string): Record<string, string>` — parses `sdkmanager --list_installed` table into `{ "ndk;27.1.12297006": "27.1.12297006", ... }` keyed by package path.

- [ ] **Step 1: Write the failing test**

`devkit/test/detect.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  parseJavaVersion,
  parseAdbVersion,
  parseSdkmanagerInstalled,
} from '../src/lib/detect.js';

describe('parseJavaVersion', () => {
  it('parses modern JDK output', () => {
    const stderr = 'openjdk version "17.0.13" 2024-10-15\nOpenJDK Runtime…';
    expect(parseJavaVersion(stderr)).toBe('17.0.13');
  });
  it('parses legacy Java 8 output', () => {
    const stderr = 'java version "1.8.0_202"\nJava(TM) SE Runtime…';
    expect(parseJavaVersion(stderr)).toBe('1.8.0_202');
  });
  it('returns null when absent', () => {
    expect(parseJavaVersion('command not found')).toBeNull();
  });
});

describe('parseAdbVersion', () => {
  it('extracts the adb version', () => {
    const out = 'Android Debug Bridge version 1.0.41\nVersion 35.0.2-12345';
    expect(parseAdbVersion(out)).toBe('1.0.41');
  });
  it('returns null when absent', () => {
    expect(parseAdbVersion('')).toBeNull();
  });
});

describe('parseSdkmanagerInstalled', () => {
  it('maps installed package paths to versions', () => {
    const out = [
      'Installed packages:',
      '  Path                 | Version       | Description',
      '  -------              | -------       | -------',
      '  ndk;27.1.12297006    | 27.1.12297006 | NDK (Side by side)',
      '  cmake;3.22.1         | 3.22.1        | CMake 3.22.1',
      '  platform-tools       | 35.0.2        | Android SDK Platform-Tools',
    ].join('\n');
    const map = parseSdkmanagerInstalled(out);
    expect(map['ndk;27.1.12297006']).toBe('27.1.12297006');
    expect(map['cmake;3.22.1']).toBe('3.22.1');
    expect(map['platform-tools']).toBe('35.0.2');
  });
  it('returns an empty map for empty input', () => {
    expect(parseSdkmanagerInstalled('')).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @sublime-ui/devkit`
Expected: FAIL — cannot resolve `../src/lib/detect.js`.

- [ ] **Step 3: Write the implementation**

`devkit/src/lib/detect.ts`:
```ts
/** Java prints `… version "X"` to stderr. Returns the quoted version. */
export function parseJavaVersion(stderr: string): string | null {
  const match = stderr.match(/version "([^"]+)"/);
  return match ? (match[1] ?? null) : null;
}

/** Parses `adb --version` ("Android Debug Bridge version 1.0.41"). */
export function parseAdbVersion(stdout: string): string | null {
  const match = stdout.match(/version (\d+\.\d+\.\d+)/);
  return match ? (match[1] ?? null) : null;
}

/**
 * Parses `sdkmanager --list_installed` pipe-delimited rows into
 * { "<package;path>": "<version>" }. Header/separator rows are skipped.
 */
export function parseSdkmanagerInstalled(
  stdout: string,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of stdout.split('\n')) {
    if (!rawLine.includes('|')) continue;
    const cells = rawLine.split('|').map((c) => c.trim());
    const path = cells[0];
    const version = cells[1];
    if (path === undefined || version === undefined) continue;
    if (path === '' || path === 'Path' || path.startsWith('---')) continue;
    if (version === 'Version') continue;
    result[path] = version;
  }
  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w @sublime-ui/devkit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add devkit/src/lib/detect.ts devkit/test/detect.test.ts
git commit -m "feat(devkit): add env-probe output parsers (java, adb, sdkmanager)"
```

---

## Task 5: `gradle.ts` — missing-SDK-component parser (pure, TDD)

**Files:**
- Create: `devkit/src/lib/gradle.ts`
- Test: `devkit/test/gradle.test.ts`

**Interfaces:**
- Consumes: nothing (operates on captured Gradle stderr/stdout).
- Produces: `parseMissingSdkComponents(output: string): string[]` — returns sdkmanager package ids (e.g. `["ndk;27.1.12297006", "cmake;3.22.1"]`), de-duplicated, in first-seen order. Empty array when none.

- [ ] **Step 1: Write the failing test**

`devkit/test/gradle.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { parseMissingSdkComponents } from '../src/lib/gradle.js';

describe('parseMissingSdkComponents', () => {
  it('extracts NDK and CMake ids from the real failure text', () => {
    const stderr = [
      '> Task :app:configureCMakeRelWithDebInfo FAILED',
      'com.android.builder.sdk.InstallFailedException: Failed to install the following SDK components:',
      '      ndk;27.1.12297006 NDK (Side by side) 27.1.12297006',
      '      cmake;3.22.1 CMake 3.22.1',
      'The SDK directory is not writable…',
    ].join('\n');
    expect(parseMissingSdkComponents(stderr)).toEqual([
      'ndk;27.1.12297006',
      'cmake;3.22.1',
    ]);
  });

  it('handles a single missing component', () => {
    const stderr =
      'Failed to install the following Android SDK packages as some licences have not been accepted.\n   ndk;27.1.12297006 NDK (Side by side)';
    expect(parseMissingSdkComponents(stderr)).toEqual(['ndk;27.1.12297006']);
  });

  it('de-duplicates repeated ids', () => {
    const stderr = 'need cmake;3.22.1\nalso cmake;3.22.1 again';
    expect(parseMissingSdkComponents(stderr)).toEqual(['cmake;3.22.1']);
  });

  it('returns empty array when nothing is missing', () => {
    expect(parseMissingSdkComponents('BUILD SUCCESSFUL in 42s')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @sublime-ui/devkit`
Expected: FAIL — cannot resolve `../src/lib/gradle.js`.

- [ ] **Step 3: Write the implementation** (parser only; scoped runner added in Task 10)

`devkit/src/lib/gradle.ts`:
```ts
/**
 * Scans Gradle output for sdkmanager package ids the build needs but lacks.
 * Matches tokens of the form `pkg;version` (e.g. ndk;27.1.12297006,
 * cmake;3.22.1, platforms;android-35). De-duplicated, first-seen order.
 */
export function parseMissingSdkComponents(output: string): string[] {
  const idPattern = /\b([a-z][a-z-]*(?:;[A-Za-z0-9._-]+)+)/g;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const match of output.matchAll(idPattern)) {
    const id = match[1];
    if (id === undefined || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w @sublime-ui/devkit`
Expected: PASS.

> Note: the `idPattern` requires a lowercase-led package name plus at least one `;segment`, so prose like "SDK components:" never matches; only real ids (`ndk;…`, `cmake;…`, `platforms;android-35`) do.

- [ ] **Step 5: Commit**

```bash
git add devkit/src/lib/gradle.ts devkit/test/gradle.test.ts
git commit -m "feat(devkit): parse missing SDK components from Gradle output"
```

---

## Task 6: `exec.ts` + `log.ts` utilities

**Files:**
- Create: `devkit/src/util/exec.ts`
- Create: `devkit/src/util/log.ts`
- Test: `devkit/test/log.test.ts`

**Interfaces:**
- Consumes: `execa`, `picocolors`.
- Produces:
  - `run(file, args, opts?): Promise<{ stdout, stderr, exitCode }>` — never throws on non-zero (returns the result); merges `opts.env` over `process.env`.
  - `runInherit(file, args, opts?): Promise<number>` — streams child stdio to the terminal, returns exit code.
  - `log.info/success/warn/error(msg)`, `log.step(msg)`, and `renderTable(rows: { label: string; ok: boolean; detail: string }[]): string` (pure → unit-tested).

- [ ] **Step 1: Write the failing test for the pure table renderer**

`devkit/test/log.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { renderTable } from '../src/util/log.js';

describe('renderTable', () => {
  it('renders a check/cross per row with aligned labels', () => {
    const out = renderTable([
      { label: 'Node', ok: true, detail: 'v24.16.0' },
      { label: 'JDK 17', ok: false, detail: 'not found' },
    ]);
    expect(out).toContain('Node');
    expect(out).toContain('v24.16.0');
    expect(out).toContain('JDK 17');
    expect(out).toContain('not found');
    // one line per row
    expect(out.trim().split('\n')).toHaveLength(2);
    // pass marker on row 1, fail marker on row 2
    const [line1, line2] = out.trim().split('\n');
    expect(line1).toMatch(/✓|OK/);
    expect(line2).toMatch(/✗|X/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @sublime-ui/devkit`
Expected: FAIL — cannot resolve `../src/util/log.js`.

- [ ] **Step 3: Write `log.ts`**

`devkit/src/util/log.ts`:
```ts
import pc from 'picocolors';

export interface TableRow {
  label: string;
  ok: boolean;
  detail: string;
}

/** Pure: builds an aligned ✓/✗ table string (no color codes in content). */
export function renderTable(rows: TableRow[]): string {
  const width = rows.reduce((m, r) => Math.max(m, r.label.length), 0);
  return rows
    .map((r) => {
      const mark = r.ok ? '✓' : '✗';
      return `${mark} ${r.label.padEnd(width)}  ${r.detail}`;
    })
    .join('\n');
}

export const log = {
  info: (m: string): void => console.log(m),
  step: (m: string): void => console.log(pc.cyan(`→ ${m}`)),
  success: (m: string): void => console.log(pc.green(`✓ ${m}`)),
  warn: (m: string): void => console.log(pc.yellow(`! ${m}`)),
  error: (m: string): void => console.error(pc.red(`✗ ${m}`)),
  table: (rows: TableRow[]): void => {
    for (const r of rows) {
      const mark = r.ok ? pc.green('✓') : pc.red('✗');
      console.log(`${mark} ${r.label.padEnd(12)}  ${pc.dim(r.detail)}`);
    }
  },
};
```

- [ ] **Step 4: Write `exec.ts`**

`devkit/src/util/exec.ts`:
```ts
import { execa } from 'execa';

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface RunOptions {
  cwd?: string;
  env?: Record<string, string>;
}

/** Runs a process, capturing output. Never throws on non-zero exit. */
export async function run(
  file: string,
  args: string[],
  opts: RunOptions = {},
): Promise<RunResult> {
  const result = await execa(file, args, {
    cwd: opts.cwd,
    env: { ...process.env, ...opts.env },
    reject: false,
    all: false,
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.exitCode ?? 1,
  };
}

/** Runs a process with inherited stdio (live output). Returns exit code. */
export async function runInherit(
  file: string,
  args: string[],
  opts: RunOptions = {},
): Promise<number> {
  const result = await execa(file, args, {
    cwd: opts.cwd,
    env: { ...process.env, ...opts.env },
    stdio: 'inherit',
    reject: false,
  });
  return result.exitCode ?? 1;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -w @sublime-ui/devkit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add devkit/src/util/exec.ts devkit/src/util/log.ts devkit/test/log.test.ts
git commit -m "feat(devkit): add exec wrapper and logging/table utilities"
```

---

## Task 7: `doctor-report.ts` — pure report model (TDD)

**Files:**
- Create: `devkit/src/lib/doctor-report.ts`
- Test: `devkit/test/doctor-report.test.ts`

**Interfaces:**
- Consumes: `REQUIREMENTS`, `satisfiesMajor`, `satisfiesExact` (Task 3); `TableRow` (Task 6).
- Produces:
  - `interface Probes { node: string | null; jdk17: string | null; androidHome: string | null; sdkmanager: boolean; platformTools: boolean; ndk: string | null; cmake: string | null; }`
  - `interface DoctorReport { rows: TableRow[]; ok: boolean; }`
  - `buildDoctorReport(probes: Probes): DoctorReport` — one row per requirement, `ok` overall = all **required** rows pass. `androidHome` presence is required; `sdkmanager`/`platform-tools`/`ndk`/`cmake` are required for building but `setup`/`build` can install them, so they are reported and counted in `ok`.

- [ ] **Step 1: Write the failing test**

`devkit/test/doctor-report.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildDoctorReport, type Probes } from '../src/lib/doctor-report.js';

const fullyEquipped: Probes = {
  node: 'v24.16.0',
  jdk17: '17.0.13',
  androidHome: 'C:\\Users\\Public\\Android\\Sdk',
  sdkmanager: true,
  platformTools: true,
  ndk: '27.1.12297006',
  cmake: '3.22.1',
};

describe('buildDoctorReport', () => {
  it('reports all-green for a fully equipped env', () => {
    const report = buildDoctorReport(fullyEquipped);
    expect(report.ok).toBe(true);
    expect(report.rows.every((r) => r.ok)).toBe(true);
    expect(report.rows).toHaveLength(7);
  });

  it('flags a broken env and is not ok', () => {
    const report = buildDoctorReport({
      ...fullyEquipped,
      jdk17: '1.8.0_202', // too old
      ndk: null, // missing
      cmake: '3.18.1', // wrong version
    });
    expect(report.ok).toBe(false);
    const jdkRow = report.rows.find((r) => r.label.includes('JDK'));
    const ndkRow = report.rows.find((r) => r.label.includes('NDK'));
    const cmakeRow = report.rows.find((r) => r.label.includes('CMake'));
    expect(jdkRow?.ok).toBe(false);
    expect(ndkRow?.ok).toBe(false);
    expect(cmakeRow?.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @sublime-ui/devkit`
Expected: FAIL — cannot resolve `../src/lib/doctor-report.js`.

- [ ] **Step 3: Write the implementation**

`devkit/src/lib/doctor-report.ts`:
```ts
import {
  REQUIREMENTS,
  satisfiesMajor,
  satisfiesExact,
} from './requirements.js';
import type { TableRow } from '../util/log.js';

export interface Probes {
  node: string | null;
  jdk17: string | null;
  androidHome: string | null;
  sdkmanager: boolean;
  platformTools: boolean;
  ndk: string | null;
  cmake: string | null;
}

export interface DoctorReport {
  rows: TableRow[];
  ok: boolean;
}

export function buildDoctorReport(probes: Probes): DoctorReport {
  const rows: TableRow[] = [
    {
      label: 'Node >=18',
      ok: satisfiesMajor(probes.node, REQUIREMENTS.node.min),
      detail: probes.node ?? 'not found',
    },
    {
      label: 'JDK 17',
      ok: satisfiesMajor(probes.jdk17, REQUIREMENTS.jdk.major),
      detail: probes.jdk17 ?? 'not found (run: sublime setup)',
    },
    {
      label: 'ANDROID_HOME',
      ok: probes.androidHome !== null,
      detail: probes.androidHome ?? 'not set',
    },
    {
      label: 'sdkmanager',
      ok: probes.sdkmanager,
      detail: probes.sdkmanager ? 'cmdline-tools present' : 'missing',
    },
    {
      label: 'platform-tools',
      ok: probes.platformTools,
      detail: probes.platformTools ? 'adb present' : 'missing',
    },
    {
      label: `NDK ${REQUIREMENTS.ndk}`,
      ok: satisfiesExact(probes.ndk, REQUIREMENTS.ndk),
      detail: probes.ndk ?? 'missing (auto-installed on build)',
    },
    {
      label: `CMake ${REQUIREMENTS.cmake}`,
      ok: satisfiesExact(probes.cmake, REQUIREMENTS.cmake),
      detail: probes.cmake ?? 'missing (auto-installed on build)',
    },
  ];
  return { rows, ok: rows.every((r) => r.ok) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w @sublime-ui/devkit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add devkit/src/lib/doctor-report.ts devkit/test/doctor-report.test.ts
git commit -m "feat(devkit): add pure doctor report model"
```

---

## Task 8: `doctor` command — live probes + report

**Files:**
- Create: `devkit/src/lib/probe.ts`
- Create: `devkit/src/commands/doctor.ts`
- Test: `devkit/test/probe.test.ts`

**Interfaces:**
- Consumes: `run` (Task 6), parsers from `detect.ts` (Task 4), `REQUIREMENTS` (Task 3), `buildDoctorReport`/`Probes` (Task 7), `log` (Task 6).
- Produces:
  - `resolveAndroidHome(env: NodeJS.ProcessEnv): string | null` — pure; checks `ANDROID_HOME` then `ANDROID_SDK_ROOT`.
  - `sdkmanagerPath(androidHome: string): string` — pure; joins `cmdline-tools/latest/bin/sdkmanager(.bat)` for the platform.
  - `async gatherProbes(): Promise<Probes>` — runs the live commands.
  - `async doctorCommand(): Promise<number>` — prints the table, returns exit code (0 ok / 1 broken).

- [ ] **Step 1: Write the failing test for the pure helpers**

`devkit/test/probe.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { resolveAndroidHome, sdkmanagerPath } from '../src/lib/probe.js';

describe('resolveAndroidHome', () => {
  it('prefers ANDROID_HOME', () => {
    expect(resolveAndroidHome({ ANDROID_HOME: '/a', ANDROID_SDK_ROOT: '/b' })).toBe('/a');
  });
  it('falls back to ANDROID_SDK_ROOT', () => {
    expect(resolveAndroidHome({ ANDROID_SDK_ROOT: '/b' })).toBe('/b');
  });
  it('returns null when neither is set', () => {
    expect(resolveAndroidHome({})).toBeNull();
  });
});

describe('sdkmanagerPath', () => {
  it('builds the cmdline-tools path', () => {
    const p = sdkmanagerPath('/sdk');
    expect(p).toContain('cmdline-tools');
    expect(p).toContain('sdkmanager');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @sublime-ui/devkit`
Expected: FAIL — cannot resolve `../src/lib/probe.js`.

- [ ] **Step 3: Write `probe.ts`**

`devkit/src/lib/probe.ts`:
```ts
import { join } from 'node:path';
import { run } from '../util/exec.js';
import {
  parseJavaVersion,
  parseAdbVersion,
  parseSdkmanagerInstalled,
} from './detect.js';
import { REQUIREMENTS } from './requirements.js';
import type { Probes } from './doctor-report.js';

export function resolveAndroidHome(env: NodeJS.ProcessEnv): string | null {
  return env['ANDROID_HOME'] ?? env['ANDROID_SDK_ROOT'] ?? null;
}

export function sdkmanagerPath(androidHome: string): string {
  const bin = process.platform === 'win32' ? 'sdkmanager.bat' : 'sdkmanager';
  return join(androidHome, 'cmdline-tools', 'latest', 'bin', bin);
}

export async function gatherProbes(): Promise<Probes> {
  const nodeRes = await run(process.execPath, ['-v']);
  const javaRes = await run('java', ['-version']);
  const androidHome = resolveAndroidHome(process.env);

  let sdkmanager = false;
  let installed: Record<string, string> = {};
  if (androidHome !== null) {
    const smPath = sdkmanagerPath(androidHome);
    const listRes = await run(smPath, ['--list_installed']);
    sdkmanager = listRes.exitCode === 0;
    installed = parseSdkmanagerInstalled(listRes.stdout);
  }

  const adbRes = await run('adb', ['--version']);

  return {
    node: nodeRes.stdout.trim() || null,
    jdk17: parseJavaVersion(javaRes.stderr),
    androidHome,
    sdkmanager,
    platformTools: parseAdbVersion(adbRes.stdout) !== null,
    ndk: installed[`ndk;${REQUIREMENTS.ndk}`] ?? null,
    cmake: installed[`cmake;${REQUIREMENTS.cmake}`] ?? null,
  };
}
```

- [ ] **Step 4: Write `doctor.ts`**

`devkit/src/commands/doctor.ts`:
```ts
import { gatherProbes } from '../lib/probe.js';
import { buildDoctorReport } from '../lib/doctor-report.js';
import { log } from '../util/log.js';

export async function doctorCommand(): Promise<number> {
  log.step('Checking environment for offline Android builds…');
  const probes = await gatherProbes();
  const report = buildDoctorReport(probes);
  log.table(report.rows);
  if (report.ok) {
    log.success('Environment ready. Run: sublime build');
    return 0;
  }
  log.warn('Some requirements are missing. Run: sublime setup');
  return 1;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -w @sublime-ui/devkit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add devkit/src/lib/probe.ts devkit/src/commands/doctor.ts devkit/test/probe.test.ts
git commit -m "feat(devkit): add doctor command with live env probes"
```

---

## Task 9: `sdkmanager.ts` + `jdk.ts` — install/validate glue

**Files:**
- Create: `devkit/src/lib/sdkmanager.ts`
- Create: `devkit/src/lib/jdk.ts`
- Test: `devkit/test/sdkmanager.test.ts`

**Interfaces:**
- Consumes: `run`/`runInherit` (Task 6), `sdkmanagerPath` (Task 8), `REQUIREMENTS`/`JDK_DOWNLOAD`/`CMDLINE_TOOLS_URL` (Task 3), `log` (Task 6).
- Produces:
  - `isValidNdk(ndkDir: string): boolean` — pure-ish (fs existence); true only if `source.properties` **and** an `ndk-build`/`ndk-build.cmd` **and** a clang toolchain exist.
  - `async ensureComponents(androidHome: string, ids: string[], jdk17Home: string): Promise<void>` — runs sdkmanager (scoped to JDK 17) to install ids, accepting licenses; revalidates NDK dirs and reinstalls if corrupt.
  - `async ensurePortableJdk17(): Promise<string>` — returns a JDK 17 home dir, downloading the Temurin zip into `~/.sublime/jdk-17/` if absent (Windows). On macOS/Linux returns the system JDK 17 home or throws with guidance.
  - `sublimeHomeDir(): string` — `~/.sublime`.

- [ ] **Step 1: Write the failing test for `isValidNdk`** (uses a temp dir)

`devkit/test/sdkmanager.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isValidNdk } from '../src/lib/sdkmanager.js';

let dir = '';
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ndk-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('isValidNdk', () => {
  it('false when the dir lacks source.properties', () => {
    expect(isValidNdk(dir)).toBe(false);
  });

  it('true when source.properties + ndk-build + clang exist', () => {
    writeFileSync(join(dir, 'source.properties'), 'Pkg.Revision = 27.1.12297006');
    writeFileSync(join(dir, 'ndk-build.cmd'), '');
    const clangDir = join(dir, 'toolchains', 'llvm', 'prebuilt', 'windows-x86_64', 'bin');
    mkdirSync(clangDir, { recursive: true });
    writeFileSync(join(clangDir, 'clang.exe'), '');
    expect(isValidNdk(dir)).toBe(true);
  });

  it('false when only package.xml exists (corrupt partial install)', () => {
    writeFileSync(join(dir, 'package.xml'), '<x/>');
    expect(isValidNdk(dir)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @sublime-ui/devkit`
Expected: FAIL — cannot resolve `../src/lib/sdkmanager.js`.

- [ ] **Step 3: Write `sdkmanager.ts`**

`devkit/src/lib/sdkmanager.ts`:
```ts
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { sdkmanagerPath } from './probe.js';
import { run } from '../util/exec.js';
import { log } from '../util/log.js';

/** A complete NDK has source.properties, an ndk-build script, and clang. */
export function isValidNdk(ndkDir: string): boolean {
  if (!existsSync(join(ndkDir, 'source.properties'))) return false;
  const hasNdkBuild =
    existsSync(join(ndkDir, 'ndk-build')) ||
    existsSync(join(ndkDir, 'ndk-build.cmd'));
  if (!hasNdkBuild) return false;
  const llvmBin = join(ndkDir, 'toolchains', 'llvm', 'prebuilt');
  if (!existsSync(llvmBin)) return false;
  // any host subdir containing a clang binary
  for (const host of readdirSync(llvmBin)) {
    const bin = join(llvmBin, host, 'bin');
    if (
      existsSync(join(bin, 'clang.exe')) ||
      existsSync(join(bin, 'clang'))
    ) {
      return true;
    }
  }
  return false;
}

function ndkDirFor(androidHome: string, id: string): string | null {
  const m = id.match(/^ndk;(.+)$/);
  return m ? join(androidHome, 'ndk', m[1] ?? '') : null;
}

/**
 * Installs the given sdkmanager ids, scoped to JDK 17, accepting licenses.
 * Removes and reinstalls any NDK dir that validates as corrupt.
 */
export async function ensureComponents(
  androidHome: string,
  ids: string[],
  jdk17Home: string,
): Promise<void> {
  if (ids.length === 0) return;
  const smPath = sdkmanagerPath(androidHome);
  const env = { JAVA_HOME: jdk17Home, ANDROID_HOME: androidHome };

  for (const id of ids) {
    const ndkDir = ndkDirFor(androidHome, id);
    if (ndkDir !== null && existsSync(ndkDir) && !isValidNdk(ndkDir)) {
      log.warn(`Removing corrupt NDK at ${ndkDir}`);
      rmSync(ndkDir, { recursive: true, force: true });
    }
    log.step(`Installing ${id} …`);
    // Pipe license acceptance via stdin "y".
    const res = await run(smPath, [`--sdk_root=${androidHome}`, id, '--channel=0'], {
      env,
    });
    if (res.exitCode !== 0) {
      // accept licenses then retry once
      await run(smPath, [`--sdk_root=${androidHome}`, '--licenses'], { env });
      const retry = await run(smPath, [`--sdk_root=${androidHome}`, id], { env });
      if (retry.exitCode !== 0) {
        throw new Error(`Failed to install ${id}:\n${retry.stderr || retry.stdout}`);
      }
    }
    if (ndkDir !== null && !isValidNdk(ndkDir)) {
      throw new Error(`NDK install incomplete at ${ndkDir}`);
    }
  }
}
```

> Implementation note: `sdkmanager` reads license prompts from stdin. If a sandbox blocks interactive stdin, run `--licenses` first (as above) which writes accepted-license hashes to `licenses/`, making subsequent installs non-interactive. The smoke test (Task 15) confirms this path on the real machine.

- [ ] **Step 4: Write `jdk.ts`**

`devkit/src/lib/jdk.ts`:
```ts
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { run, runInherit } from '../util/exec.js';
import { JDK_DOWNLOAD } from './requirements.js';
import { log } from '../util/log.js';

export function sublimeHomeDir(): string {
  return join(homedir(), '.sublime');
}

/**
 * Returns a JDK 17 home. On Windows, downloads a portable Temurin 17 into
 * ~/.sublime/jdk-17 if absent (no admin; system Java untouched). On other
 * platforms, expects JDK 17 on PATH and returns JAVA_HOME or throws.
 */
export async function ensurePortableJdk17(): Promise<string> {
  if (process.platform !== 'win32') {
    const home = process.env['JAVA_HOME'];
    if (home && existsSync(home)) return home;
    throw new Error(
      'JDK 17 required. Install it (e.g. `brew install temurin@17`) and set JAVA_HOME.',
    );
  }

  const root = join(sublimeHomeDir(), 'jdk-17');
  const marker = join(root, 'bin', 'java.exe');
  if (existsSync(marker)) return root;

  mkdirSync(sublimeHomeDir(), { recursive: true });
  const zipPath = join(sublimeHomeDir(), 'jdk-17.zip');
  log.step('Downloading portable JDK 17 (Temurin)…');
  // Use PowerShell for download + expand to avoid extra deps.
  await runInherit('powershell', [
    '-NoProfile',
    '-Command',
    `Invoke-WebRequest -Uri '${JDK_DOWNLOAD.windowsX64}' -OutFile '${zipPath}'`,
  ]);
  log.step('Extracting JDK 17…');
  await runInherit('powershell', [
    '-NoProfile',
    '-Command',
    `Expand-Archive -Path '${zipPath}' -DestinationPath '${join(sublimeHomeDir(), 'jdk-17-tmp')}' -Force`,
  ]);
  // Temurin zip extracts to a versioned subfolder; find the one with bin/java.exe.
  const tmp = join(sublimeHomeDir(), 'jdk-17-tmp');
  const inner = (await run('powershell', [
    '-NoProfile',
    '-Command',
    `(Get-ChildItem -Directory '${tmp}' | Select-Object -First 1).FullName`,
  ])).stdout.trim();
  await runInherit('powershell', [
    '-NoProfile',
    '-Command',
    `Move-Item -Path '${inner}' -Destination '${root}' -Force`,
  ]);
  if (!existsSync(marker)) {
    throw new Error('Portable JDK 17 extraction failed.');
  }
  return root;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -w @sublime-ui/devkit`
Expected: PASS (`isValidNdk` specs green).

- [ ] **Step 6: Commit**

```bash
git add devkit/src/lib/sdkmanager.ts devkit/src/lib/jdk.ts devkit/test/sdkmanager.test.ts
git commit -m "feat(devkit): add sdkmanager install/validate and portable JDK 17 fetch"
```

---

## Task 10: `gradle.ts` scoped runner + self-healing build loop

**Files:**
- Modify: `devkit/src/lib/gradle.ts` (append runner; keep the parser from Task 5)
- Test: `devkit/test/gradle-loop.test.ts`

**Interfaces:**
- Consumes: `parseMissingSdkComponents` (Task 5), `runInherit`/`run` (Task 6), `ensureComponents` (Task 9), `log` (Task 6).
- Produces:
  - `gradlewPath(projectAndroidDir: string): string` — pure; `gradlew.bat` on Windows else `gradlew`.
  - `async runGradleWithHealing(opts): Promise<void>` where `opts = { androidDir, task, jdk17Home, androidHome, maxAttempts?, runner?, installer? }`. `runner(task) => Promise<{ exitCode, output }>` and `installer(ids) => Promise<void>` are injectable for unit testing; defaults call the real Gradle/sdkmanager. Loops: run task → if success return → else parse missing ids → if none, throw → install → retry, bounded by `maxAttempts` (default 4).

- [ ] **Step 1: Write the failing test (injected runner/installer, no real Gradle)**

`devkit/test/gradle-loop.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { runGradleWithHealing } from '../src/lib/gradle.js';

describe('runGradleWithHealing', () => {
  it('installs missing components then succeeds on retry', async () => {
    const installed: string[][] = [];
    let attempt = 0;
    const runner = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) {
        return {
          exitCode: 1,
          output:
            'Failed to install the following SDK components:\n  ndk;27.1.12297006 NDK\n  cmake;3.22.1 CMake',
        };
      }
      return { exitCode: 0, output: 'BUILD SUCCESSFUL' };
    });
    const installer = vi.fn(async (ids: string[]) => {
      installed.push(ids);
    });

    await runGradleWithHealing({
      androidDir: '/proj/android',
      task: 'assembleRelease',
      jdk17Home: '/jdk',
      androidHome: '/sdk',
      runner,
      installer,
    });

    expect(runner).toHaveBeenCalledTimes(2);
    expect(installed).toEqual([['ndk;27.1.12297006', 'cmake;3.22.1']]);
  });

  it('throws when the failure has no installable component', async () => {
    const runner = vi.fn(async () => ({ exitCode: 1, output: 'compilation error: foo' }));
    const installer = vi.fn(async () => {});
    await expect(
      runGradleWithHealing({
        androidDir: '/p', task: 'assembleRelease', jdk17Home: '/j',
        androidHome: '/s', runner, installer,
      }),
    ).rejects.toThrow(/no installable/i);
    expect(installer).not.toHaveBeenCalled();
  });

  it('stops after maxAttempts', async () => {
    const runner = vi.fn(async () => ({
      exitCode: 1,
      output: 'Failed to install: ndk;27.1.12297006',
    }));
    const installer = vi.fn(async () => {});
    await expect(
      runGradleWithHealing({
        androidDir: '/p', task: 'assembleRelease', jdk17Home: '/j',
        androidHome: '/s', runner, installer, maxAttempts: 2,
      }),
    ).rejects.toThrow(/after 2 attempts/i);
    expect(runner).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @sublime-ui/devkit`
Expected: FAIL — `runGradleWithHealing` is not exported.

- [ ] **Step 3: Append the runner to `gradle.ts`** (keep `parseMissingSdkComponents` unchanged above it)

Append to `devkit/src/lib/gradle.ts`:
```ts
import { join } from 'node:path';
import { runInherit, run } from '../util/exec.js';
import { ensureComponents } from './sdkmanager.js';
import { log } from '../util/log.js';

export function gradlewPath(projectAndroidDir: string): string {
  const script = process.platform === 'win32' ? 'gradlew.bat' : 'gradlew';
  return join(projectAndroidDir, script);
}

export interface GradleRunResult {
  exitCode: number;
  output: string;
}

export interface HealingOptions {
  androidDir: string;
  task: string;
  jdk17Home: string;
  androidHome: string;
  maxAttempts?: number;
  runner?: (task: string) => Promise<GradleRunResult>;
  installer?: (ids: string[]) => Promise<void>;
}

async function defaultRunner(
  androidDir: string,
  task: string,
  jdk17Home: string,
  androidHome: string,
): Promise<GradleRunResult> {
  const gw = gradlewPath(androidDir);
  const env = { JAVA_HOME: jdk17Home, ANDROID_HOME: androidHome };
  // Capture output for parsing while still echoing progress.
  const res = await run(gw, [task, '--no-daemon', '--stacktrace'], {
    cwd: androidDir,
    env,
  });
  process.stdout.write(res.stdout);
  process.stderr.write(res.stderr);
  return { exitCode: res.exitCode, output: `${res.stdout}\n${res.stderr}` };
}

export async function runGradleWithHealing(opts: HealingOptions): Promise<void> {
  const maxAttempts = opts.maxAttempts ?? 4;
  const runner =
    opts.runner ??
    ((task: string) =>
      defaultRunner(opts.androidDir, task, opts.jdk17Home, opts.androidHome));
  const installer =
    opts.installer ??
    ((ids: string[]) =>
      ensureComponents(opts.androidHome, ids, opts.jdk17Home));

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    log.step(`Gradle ${opts.task} (attempt ${attempt}/${maxAttempts})…`);
    const result = await runner(opts.task);
    if (result.exitCode === 0) {
      log.success(`Gradle ${opts.task} succeeded.`);
      return;
    }
    const missing = parseMissingSdkComponents(result.output);
    if (missing.length === 0) {
      throw new Error(
        `Gradle failed with no installable SDK component to recover.\n${result.output.slice(-2000)}`,
      );
    }
    log.warn(`Missing SDK components: ${missing.join(', ')} — installing…`);
    await installer(missing);
  }
  throw new Error(`Gradle ${opts.task} failed after ${maxAttempts} attempts.`);
}
```

> Note: `runInherit` is imported for symmetry with other glue but the runner uses `run` to capture output for parsing; remove the unused import if lint flags it. (If `noUnusedLocals` complains, drop `runInherit` from this import line.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w @sublime-ui/devkit`
Expected: PASS (all three loop specs).

- [ ] **Step 5: Typecheck/lint to catch the unused import**

Run: `npm run typecheck -w @sublime-ui/devkit && npm run lint -w @sublime-ui/devkit`
Expected: PASS. If lint flags `runInherit` unused, change the import to `import { run } from '../util/exec.js';` and re-run.

- [ ] **Step 6: Commit**

```bash
git add devkit/src/lib/gradle.ts devkit/test/gradle-loop.test.ts
git commit -m "feat(devkit): add self-healing scoped Gradle runner"
```

---

## Task 11: `android.ts` + `run` command — adb device/install/launch

**Files:**
- Create: `devkit/src/lib/android.ts`
- Create: `devkit/src/commands/run.ts`
- Test: `devkit/test/android.test.ts`

**Interfaces:**
- Consumes: `run` (Task 6), `log` (Task 6).
- Produces:
  - `parseAdbDevices(stdout: string): string[]` — pure; serials of `device`-state entries (skips header, `offline`, `unauthorized`).
  - `async listDevices(): Promise<string[]>`
  - `async installApk(serial: string, apkPath: string): Promise<void>` — `adb -s <serial> install -r <apk>`.
  - `async launchActivity(serial: string, pkg: string): Promise<void>` — `adb -s <serial> shell monkey -p <pkg> -c android.intent.category.LAUNCHER 1`.
  - `async runCommand(opts: { project: string; device?: string }): Promise<number>`.

- [ ] **Step 1: Write the failing test**

`devkit/test/android.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { parseAdbDevices } from '../src/lib/android.js';

describe('parseAdbDevices', () => {
  it('returns serials only for ready devices', () => {
    const out = [
      'List of devices attached',
      'emulator-5554\tdevice',
      'ABC123XYZ\tdevice',
      'BADdevice\toffline',
      'UNAUTH99\tunauthorized',
      '',
    ].join('\n');
    expect(parseAdbDevices(out)).toEqual(['emulator-5554', 'ABC123XYZ']);
  });
  it('returns empty when none attached', () => {
    expect(parseAdbDevices('List of devices attached\n\n')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @sublime-ui/devkit`
Expected: FAIL — cannot resolve `../src/lib/android.js`.

- [ ] **Step 3: Write `android.ts`**

`devkit/src/lib/android.ts`:
```ts
import { run } from '../util/exec.js';

export function parseAdbDevices(stdout: string): string[] {
  const serials: string[] = [];
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('List of devices')) continue;
    const [serial, state] = trimmed.split(/\s+/);
    if (serial !== undefined && state === 'device') serials.push(serial);
  }
  return serials;
}

export async function listDevices(): Promise<string[]> {
  const res = await run('adb', ['devices']);
  return parseAdbDevices(res.stdout);
}

export async function installApk(serial: string, apkPath: string): Promise<void> {
  const res = await run('adb', ['-s', serial, 'install', '-r', apkPath]);
  if (res.exitCode !== 0) {
    throw new Error(`adb install failed:\n${res.stderr || res.stdout}`);
  }
}

export async function launchActivity(serial: string, pkg: string): Promise<void> {
  const res = await run('adb', [
    '-s', serial, 'shell', 'monkey', '-p', pkg,
    '-c', 'android.intent.category.LAUNCHER', '1',
  ]);
  if (res.exitCode !== 0) {
    throw new Error(`Failed to launch ${pkg}:\n${res.stderr || res.stdout}`);
  }
}
```

- [ ] **Step 4: Write `run.ts`**

`devkit/src/commands/run.ts`:
```ts
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { listDevices, installApk, launchActivity } from '../lib/android.js';
import { readAndroidPackageId, findReleaseApk } from './build.js';
import { log } from '../util/log.js';

export async function runCommand(opts: {
  project: string;
  device?: string;
}): Promise<number> {
  const apk = findReleaseApk(opts.project);
  if (apk === null || !existsSync(apk)) {
    log.error('No release APK found. Run: sublime build');
    return 1;
  }
  const devices = await listDevices();
  if (devices.length === 0) {
    log.error('No connected device/emulator. Start one and retry.');
    return 1;
  }
  const serial = opts.device ?? devices[0];
  if (serial === undefined) return 1;

  log.step(`Installing ${apk} on ${serial}…`);
  await installApk(serial, apk);
  const pkg = readAndroidPackageId(join(opts.project, 'app.json'));
  if (pkg === null) {
    log.error('Could not read android.package from app.json');
    return 1;
  }
  log.step(`Launching ${pkg}…`);
  await launchActivity(serial, pkg);
  log.success('Launched.');
  return 0;
}
```

> `readAndroidPackageId` and `findReleaseApk` are defined in Task 12 (`build.ts`) and re-used here; Task 12 must land before this command runs end-to-end, but the modules compile together.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -w @sublime-ui/devkit`
Expected: PASS (`parseAdbDevices` specs). Typecheck will fail until Task 12 adds the two imports — that is expected; do Task 12 next.

- [ ] **Step 6: Commit**

```bash
git add devkit/src/lib/android.ts devkit/src/commands/run.ts devkit/test/android.test.ts
git commit -m "feat(devkit): add adb device/install/launch and run command"
```

---

## Task 12: `build` command — prebuild + scoped Gradle + artifact report

**Files:**
- Create: `devkit/src/commands/build.ts`
- Test: `devkit/test/build-helpers.test.ts`

**Interfaces:**
- Consumes: `ensurePortableJdk17`/`sublimeHomeDir` (Task 9), `resolveAndroidHome`/`sdkmanagerPath` (Task 8), `runGradleWithHealing` (Task 10), `runInherit`/`run` (Task 6), `REQUIREMENTS` (Task 3), `log` (Task 6).
- Produces (also consumed by Task 11):
  - `readAndroidPackageId(appJsonPath: string): string | null` — pure; reads `expo.android.package`.
  - `findReleaseApk(projectDir: string): string | null` — pure path builder; returns `<project>/android/app/build/outputs/apk/release/app-release.apk` if it exists, else null.
  - `ensureLocalProperties(projectDir: string, androidHome: string): void` — writes `android/local.properties` with `sdk.dir` if missing.
  - `gradleTaskFor(opts: { release: boolean; aab: boolean }): string` — pure; `assembleRelease` | `assembleDebug` | `bundleRelease`.
  - `async buildCommand(opts: { project: string; release: boolean; aab: boolean }): Promise<number>`.

- [ ] **Step 1: Write the failing test for the pure helpers**

`devkit/test/build-helpers.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  readAndroidPackageId,
  findReleaseApk,
  ensureLocalProperties,
  gradleTaskFor,
} from '../src/commands/build.js';

describe('gradleTaskFor', () => {
  it('maps flags to Gradle tasks', () => {
    expect(gradleTaskFor({ release: true, aab: false })).toBe('assembleRelease');
    expect(gradleTaskFor({ release: false, aab: false })).toBe('assembleDebug');
    expect(gradleTaskFor({ release: true, aab: true })).toBe('bundleRelease');
  });
});

describe('readAndroidPackageId', () => {
  let dir = '';
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'app-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('reads expo.android.package', () => {
    const p = join(dir, 'app.json');
    writeFileSync(p, JSON.stringify({ expo: { android: { package: 'com.demo.demoapp' } } }));
    expect(readAndroidPackageId(p)).toBe('com.demo.demoapp');
  });
  it('returns null when missing', () => {
    const p = join(dir, 'app.json');
    writeFileSync(p, JSON.stringify({ expo: {} }));
    expect(readAndroidPackageId(p)).toBeNull();
  });
});

describe('ensureLocalProperties', () => {
  let dir = '';
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'proj-')); mkdirSync(join(dir, 'android')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('writes sdk.dir when absent', () => {
    ensureLocalProperties(dir, 'C:\\Users\\Public\\Android\\Sdk');
    const content = readFileSync(join(dir, 'android', 'local.properties'), 'utf8');
    expect(content).toMatch(/sdk\.dir=/);
  });
});

describe('findReleaseApk', () => {
  let dir = '';
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'proj-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('returns null when no apk', () => {
    expect(findReleaseApk(dir)).toBeNull();
  });
  it('returns the path when the apk exists', () => {
    const apkDir = join(dir, 'android', 'app', 'build', 'outputs', 'apk', 'release');
    mkdirSync(apkDir, { recursive: true });
    writeFileSync(join(apkDir, 'app-release.apk'), 'x');
    expect(existsSync(findReleaseApk(dir) ?? '')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @sublime-ui/devkit`
Expected: FAIL — cannot resolve `../src/commands/build.js`.

- [ ] **Step 3: Write `build.ts`**

`devkit/src/commands/build.ts`:
```ts
import { existsSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ensurePortableJdk17 } from '../lib/jdk.js';
import { resolveAndroidHome } from '../lib/probe.js';
import { runGradleWithHealing } from '../lib/gradle.js';
import { runInherit } from '../util/exec.js';
import { log } from '../util/log.js';

export function gradleTaskFor(opts: { release: boolean; aab: boolean }): string {
  if (opts.aab) return 'bundleRelease';
  return opts.release ? 'assembleRelease' : 'assembleDebug';
}

export function readAndroidPackageId(appJsonPath: string): string | null {
  if (!existsSync(appJsonPath)) return null;
  const json = JSON.parse(readFileSync(appJsonPath, 'utf8')) as {
    expo?: { android?: { package?: string } };
  };
  return json.expo?.android?.package ?? null;
}

export function findReleaseApk(projectDir: string): string | null {
  const p = join(
    projectDir,
    'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk',
  );
  return existsSync(p) ? p : null;
}

export function ensureLocalProperties(
  projectDir: string,
  androidHome: string,
): void {
  const target = join(projectDir, 'android', 'local.properties');
  if (existsSync(target)) return;
  const escaped = androidHome.replace(/\\/g, '\\\\');
  writeFileSync(target, `sdk.dir=${escaped}\n`);
}

export async function buildCommand(opts: {
  project: string;
  release: boolean;
  aab: boolean;
}): Promise<number> {
  const androidHome = resolveAndroidHome(process.env);
  if (androidHome === null) {
    log.error('ANDROID_HOME/ANDROID_SDK_ROOT not set. Run: sublime doctor');
    return 1;
  }

  // 1. Prebuild if native android/ project is absent.
  const androidDir = join(opts.project, 'android');
  if (!existsSync(androidDir)) {
    log.step('Generating native Android project (expo prebuild)…');
    const code = await runInherit('npx', [
      'expo', 'prebuild', '--platform', 'android', '--no-install',
    ], { cwd: opts.project });
    if (code !== 0 || !existsSync(androidDir)) {
      log.error('expo prebuild failed.');
      return 1;
    }
  }

  // 2. Ensure local.properties + scoped JDK 17.
  ensureLocalProperties(opts.project, androidHome);
  const jdk17Home = await ensurePortableJdk17();

  // 3. Scoped, self-healing Gradle build.
  const task = gradleTaskFor({ release: opts.release, aab: opts.aab });
  await runGradleWithHealing({ androidDir, task, jdk17Home, androidHome });

  // 4. Report artifact.
  if (!opts.aab) {
    const apk = findReleaseApk(opts.project);
    if (apk !== null && existsSync(apk)) {
      const mb = (statSync(apk).size / (1024 * 1024)).toFixed(1);
      log.success(`APK ready: ${apk} (${mb} MB)`);
    }
  } else {
    log.success('AAB built under android/app/build/outputs/bundle/release/.');
  }
  return 0;
}
```

> Note on `findReleaseApk`: it returns the deterministic release-APK path when the file exists, else `null`. Callers (`run.ts`, `buildCommand`) treat `null` as "not built yet" and still guard with `existsSync` for clarity.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w @sublime-ui/devkit`
Expected: PASS (all build-helper specs).

- [ ] **Step 5: Typecheck the whole package (run + build now resolve)**

Run: `npm run typecheck -w @sublime-ui/devkit`
Expected: PASS — `run.ts`'s imports of `readAndroidPackageId`/`findReleaseApk` now resolve.

- [ ] **Step 6: Commit**

```bash
git add devkit/src/commands/build.ts devkit/test/build-helpers.test.ts
git commit -m "feat(devkit): add offline build command (prebuild + scoped self-healing Gradle)"
```

---

## Task 13: `setup` command + CLI wiring (`cli.ts`)

**Files:**
- Create: `devkit/src/commands/setup.ts`
- Create: `devkit/src/cli.ts`

**Interfaces:**
- Consumes: `doctorCommand` (Task 8), `buildCommand` (Task 12), `runCommand` (Task 11), `ensurePortableJdk17` (Task 9), `commander`.
- Produces: a commander program exposing `doctor`, `setup`, `build`, `run`; default `--project` = `process.cwd()`. `cli.ts` is the `bin` entry (`sublime` / `sui`).

- [ ] **Step 1: Write `setup.ts`**

`devkit/src/commands/setup.ts`:
```ts
import { ensurePortableJdk17 } from '../lib/jdk.js';
import { resolveAndroidHome } from '../lib/probe.js';
import { log } from '../util/log.js';

export async function setupCommand(): Promise<number> {
  if (process.platform !== 'win32') {
    log.info('Guided setup (macOS/Linux):');
    log.info('  1. Install Temurin JDK 17 and set JAVA_HOME.');
    log.info('  2. Install Android cmdline-tools; set ANDROID_HOME.');
    log.info('  3. sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"');
    log.info('  4. Re-run: sublime doctor');
    return 0;
  }
  log.step('Setting up Windows build environment…');
  const jdk = await ensurePortableJdk17();
  log.success(`Portable JDK 17 ready at ${jdk}`);
  if (resolveAndroidHome(process.env) === null) {
    log.warn('ANDROID_HOME is not set. Install Android SDK cmdline-tools and set ANDROID_HOME, then re-run: sublime doctor');
    return 1;
  }
  log.success('Setup complete. Run: sublime doctor');
  return 0;
}
```

- [ ] **Step 2: Write `cli.ts`**

`devkit/src/cli.ts`:
```ts
import { Command } from 'commander';
import { doctorCommand } from './commands/doctor.js';
import { setupCommand } from './commands/setup.js';
import { buildCommand } from './commands/build.js';
import { runCommand } from './commands/run.js';
import { log } from './util/log.js';

const program = new Command();

program
  .name('sublime')
  .description('Sublime UI devkit — offline Android builds and tooling')
  .version('0.0.0');

program
  .command('doctor')
  .description('Check the environment for offline Android builds')
  .action(async () => {
    process.exit(await doctorCommand());
  });

program
  .command('setup')
  .description('Install/repair the build environment')
  .action(async () => {
    process.exit(await setupCommand());
  });

program
  .command('build')
  .description('Build a standalone Android APK/AAB offline')
  .option('--release', 'release APK (default)', true)
  .option('--debug', 'debug APK (requires Metro)')
  .option('--aab', 'Android App Bundle (bundleRelease)')
  .option('--project <path>', 'project directory', process.cwd())
  .action(async (opts: { release: boolean; debug?: boolean; aab?: boolean; project: string }) => {
    const code = await buildCommand({
      project: opts.project,
      release: opts.debug ? false : true,
      aab: opts.aab ?? false,
    });
    process.exit(code);
  });

program
  .command('run')
  .description('Install and launch the built APK on a device')
  .option('--device <id>', 'adb device serial')
  .option('--project <path>', 'project directory', process.cwd())
  .action(async (opts: { device?: string; project: string }) => {
    process.exit(await runCommand({ project: opts.project, device: opts.device }));
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  log.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
```

- [ ] **Step 3: Build the CLI**

Run:
```bash
npm run build -w @sublime-ui/devkit
ls devkit/dist
```
Expected: `dist/cli.js` exists with the `#!/usr/bin/env node` banner.

- [ ] **Step 4: Smoke the CLI help + doctor locally**

Run:
```bash
node devkit/dist/cli.js --help
node devkit/dist/cli.js doctor
```
Expected: help lists `doctor/setup/build/run`; `doctor` prints the ✓/✗ table and exits 0 on this fully-equipped machine.

- [ ] **Step 5: Verify the linked bins resolve**

Run:
```bash
npx sublime --help
npx sui --help
```
Expected: both print the same help (workspace bin links created by `npm install`).

- [ ] **Step 6: Full monorepo gate**

Run:
```bash
npm run typecheck && npm run lint && npm run test && npm run build
```
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add devkit/src/commands/setup.ts devkit/src/cli.ts
git commit -m "feat(devkit): wire commander CLI (doctor/setup/build/run) + setup command"
```

---

## Task 14: Documentation

**Files:**
- Create: `README.md` (repo root)
- Create: `devkit/README.md`

**Interfaces:**
- Consumes: nothing.
- Produces: user-facing docs (no code contract).

- [ ] **Step 1: Write root `README.md`**

`README.md`:
```markdown
# Sublime UI

A TypeScript-only, cross-platform application-development framework — write the
non-UI parts once, run on mobile / web / desktop.

## Packages (npm workspaces, scope `@sublime-ui/*`)

| Package | Folder | Responsibility |
|---|---|---|
| `@sublime-ui/framework` | `framework/` | Core runtime + app-architecture primitives |
| `@sublime-ui/library` | `library/` | Design system (RN Paper mobile / MUI web+desktop) |
| `@sublime-ui/devkit` | `devkit/` | CLI: offline builds + code generators |

`sandbox/` holds throwaway test apps (e.g. `DemoApp`) and is **not** a workspace.

## Quick start

```bash
npm install
npm run build      # build all packages
npm run typecheck
npm run test
npm run lint
```

## Devkit — offline Android builds

```bash
npx sublime doctor          # check the environment
npx sublime setup           # install missing pieces (Windows: portable JDK 17, …)
npx sublime build           # signed standalone APK, fully offline
npx sublime run             # install + launch on a device/emulator
```

See [`devkit/README.md`](devkit/README.md) for the full reference.

## Roadmap (each is its own spec → plan → implementation)

0. Monorepo foundation ✅
1. devkit: offline Android build ✅
2. framework: app-architecture core
3. devkit: code generators
4. library: design system
5. UI cross-platform + web↔desktop sync
6. app starter template
```

- [ ] **Step 2: Write `devkit/README.md`**

`devkit/README.md`:
```markdown
# @sublime-ui/devkit

The Sublime UI developer CLI. Today it builds **standalone Android APKs fully
offline** — no EAS / cloud build. Bin names: `sublime` (alias `sui`).

## What "offline" means

- **No cloud build service** — everything runs on your machine via Gradle.
- **Offline runtime** — the default `assembleRelease` build embeds the JS bundle
  and signs with the auto-generated debug keystore, so the APK runs with **no
  Metro server**.
- Not air-gapped: the *first* Gradle build still downloads Maven/AGP artifacts.

## Commands

| Command | What it does |
|---|---|
| `sublime doctor` | Prints a ✓/✗ table for Node, JDK 17, `ANDROID_HOME`, cmdline-tools, platform-tools, NDK 27.1.12297006, CMake 3.22.1. Exits non-zero if a required piece is missing. |
| `sublime setup` | Windows: installs a **portable Temurin JDK 17** into `~/.sublime/` (no admin; your system Java is untouched). macOS/Linux: prints guided steps. |
| `sublime build [--release\|--debug] [--aab] [--project <path>]` | Runs `expo prebuild` if `android/` is absent, writes `local.properties`, then runs Gradle with a **scoped JDK 17** and self-heals missing NDK/CMake. Default = `assembleRelease`. |
| `sublime run [--device <id>] [--project <path>]` | `adb install -r` the APK and launches it. |

## Robustness (lessons baked in)

- **Self-healing SDK installs.** On `Failed to install … ndk;X / cmake;Y`, the id
  is parsed, installed via `sdkmanager`, and the build retried (max 4 attempts).
- **Corrupt-NDK detection.** An NDK dir missing `source.properties` / `ndk-build`
  / clang is removed and reinstalled.
- **Modern cmdline-tools `sdkmanager` on JDK 17** avoids the legacy
  `NoClassDefFoundError: javax/xml/bind` (JAXB removed after Java 8) crash.
- **Scoped JDK.** Build children get `JAVA_HOME` → JDK 17 for that call only; the
  system default Java is never modified.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `doctor` shows JDK 17 ✗ | `sublime setup` (Windows) or install Temurin 17 + set `JAVA_HOME`. |
| Build fails on `ndk;…`/`cmake;…` | Usually auto-healed; if it persists, check `ANDROID_HOME` is writable. |
| `NoClassDefFoundError javax/xml/bind` | You're invoking the legacy `tools/bin/sdkmanager` on JDK 17 — use cmdline-tools `latest`. |
| `run` finds no device | Start an emulator or plug in a phone with USB debugging; `adb devices`. |

## Scope

Android only (iOS needs macOS). macOS/Linux: `doctor`/`build`/`run` work;
`setup` prints guided steps instead of auto-installing.
```

- [ ] **Step 3: Commit**

```bash
git add README.md devkit/README.md
git commit -m "docs: add monorepo overview and devkit CLI reference"
```

---

## Task 15: End-to-end smoke test against `sandbox/DemoApp`

**Files:**
- Modify: none (verification task; may delete `sandbox/DemoApp/android` first to prove prebuild).

**Interfaces:**
- Consumes: the built CLI from Task 13.
- Produces: proof the CLI reproduces the signed APK and launches it.

- [ ] **Step 1: Confirm doctor passes on this machine**

Run: `node devkit/dist/cli.js doctor`
Expected: all rows ✓ (Node, JDK 17 — note: this machine's *system* Java may be 8; if the JDK 17 row is ✗, run `node devkit/dist/cli.js setup` first to fetch the portable JDK 17, which `build` uses regardless).

- [ ] **Step 2: Build the DemoApp through the CLI**

Run:
```bash
node devkit/dist/cli.js build --project "sandbox/DemoApp"
```
Expected: prebuild (if `android/` absent) → Gradle `assembleRelease`, self-healing any missing NDK/CMake → `APK ready: …app-release.apk (≈67 MB)`.

- [ ] **Step 3: Verify the APK is standalone and signed**

Run:
```bash
ls -la "sandbox/DemoApp/android/app/build/outputs/apk/release/app-release.apk"
```
Expected: file exists, ~65–70 MB. (Optional: `apksigner verify` if Android build-tools on PATH.)

- [ ] **Step 4: Install + launch via the CLI on a connected device/emulator**

Run:
```bash
node devkit/dist/cli.js run --project "sandbox/DemoApp"
```
Expected: `adb install -r` succeeds, app launches, no crash; the DemoApp counter screen appears.

- [ ] **Step 5: Record the smoke result and commit any doc tweaks**

If anything needed adjusting (paths, version strings), fold the fix into the relevant task's file and commit:
```bash
git add -A
git commit -m "test: verify devkit reproduces signed DemoApp APK end-to-end"
```

(If no code changed, no commit — the smoke test is pass/fail verification only.)

---

## Self-Review notes (author)

- **Spec coverage:** #0 root config (Task 1) + workspaces (Task 2); #1 CLI surface — doctor (Tasks 7–8), setup (Task 13), build (Task 12), run (Task 11). Robustness lessons 1–4 → Tasks 5, 9, 10. Pure-logic-isolated-for-test list (detect, gradle parse, requirements, doctor model) → Tasks 3, 4, 5, 7. Testing/smoke → Task 15. Docs → Task 14. Scope boundaries → encoded in setup (Task 13) + docs (Task 14).
- **Known cross-task coupling:** `run.ts` (Task 11) imports `readAndroidPackageId`/`findReleaseApk` from `build.ts` (Task 12); flagged in both tasks. Typecheck is green only after Task 12 — Task 11 Step 5 calls this out.
- **Type consistency:** `Probes`/`DoctorReport`/`TableRow`/`GradleRunResult`/`HealingOptions` names are used identically across producing and consuming tasks. `gradleTaskFor`, `findReleaseApk`, `readAndroidPackageId`, `ensureLocalProperties` signatures match between Tasks 11 and 12.
- **No placeholders:** every code step contains real code; no TODO/TBD.
