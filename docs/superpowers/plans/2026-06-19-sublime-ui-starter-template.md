# Sublime UI Starter Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a zero-to-running-app generator — `npm create @sublime-ui/app my-app` (via the new `@sublime-ui/create-app` package) and `sublime init [dir]` (a devkit subcommand) — that scaffolds a complete, idiomatic Sublime app from a minimal vertical slice.

**Architecture:** A pure core in `@sublime-ui/devkit` (`src/lib/scaffold/`) turns `{ appName, targets }` into a deterministic list of files (`buildScaffoldPlan`), and an orchestrator (`initApp`) resolves options (prompts or flags), writes the files with the existing `safeWrite` guard, then runs post-scaffold steps (git init, install, `build:nav`) through an injectable runner. Two thin entry points share that core: the `sublime init` command and the `@sublime-ui/create-app` bin. The generated app pins the now-published `@sublime-ui/*@^0.1.0` packages, so a fresh scaffold installs and builds against the real registry.

**Tech Stack:** TypeScript (strict, ESM), `@inquirer/prompts` (prompts), `commander` (CLI), `execa` (process spawning), `vitest` (tests), `tsup` (build). Generated apps target Vite + MUI (web), React Native + Paper (mobile), Electron Forge (desktop).

## Global Constraints

- **Published dependency pins:** the generated app references `@sublime-ui/framework`, `@sublime-ui/library`, `@sublime-ui/ui`, and (desktop only) `@sublime-ui/desktop` at `^0.1.0`. All four ranges come from one constant `SUBLIME_VERSIONS` in `devkit/src/lib/scaffold/versions.ts` — a release bump edits one file.
- **Follow existing generator conventions verbatim:** read paths via `loadConfig(cwd)` (`devkit/src/lib/generators/config.ts`); write via `safeWrite(path, content, force)` throwing `FileExistsError` (`devkit/src/lib/generators/write.ts`); log via the structured `log` object (`devkit/src/util/log.ts`); commands return integer exit codes (`0` success, `1` handled failure).
- **Refuse to clobber:** `initApp` writes into the target dir only if it is absent or empty, unless `force: true`. A non-empty dir without `--force` returns `1` with a clear message — never partially overwrite.
- **Purity boundary:** every template renderer in `src/lib/scaffold/templates/` is a pure `(...) => string` (unit-testable in isolation). `buildScaffoldPlan` is pure (`opts → ScaffoldFile[]`). Only `initApp` touches the filesystem/process, and it takes injectable `prompt`, `runner`, and `cwd` for tests.
- **Platform rules (from spec):** targets are `web` (Vite + MUI), `mobile` (React Native + Paper, `.native.tsx` screens), `desktop` (Electron, renders the **web** UI). **Desktop implies web** — selecting desktop without web is rejected with a clear message. Mobile `bottomNav` books allow ≤5 pages.
- **Naming:** app name is validated as an npm package name (lowercase, url-safe). The npm-create package is `@sublime-ui/create-app`; the invocation `npm create @sublime-ui/app` resolves to it.
- **Delegated-work rules:** any subagent/workflow agent set `model: "opus"`. **No AI attribution in commit messages** (no `Co-Authored-By: Claude`, no "Generated with…").

---

## File Structure

**New in `@sublime-ui/devkit`:**
- `src/lib/scaffold/types.ts` — `Target`, `ScaffoldFile`, `ScaffoldOptions`, `ResolvedOptions`.
- `src/lib/scaffold/versions.ts` — `SUBLIME_VERSIONS` + peer-dep ranges per target.
- `src/lib/scaffold/templates/app.ts` — root files: `package.json`, `sublime.config.json`, `tsconfig.json`, `.gitignore`, `README.md`.
- `src/lib/scaffold/templates/shared.ts` — `src/models/Task.ts`, `src/theme/tokens.json`, `src/theme/tokens.ts`, `src/models/index.ts`.
- `src/lib/scaffold/templates/web.ts` — `src/screens/web/TaskList.tsx`, `TaskDetail.tsx`, `src/navigation/storybook.web.ts`, `web/index.html`, `web/main.tsx`, `vite.config.ts`.
- `src/lib/scaffold/templates/mobile.ts` — `src/screens/mobile/TaskList.native.tsx`, `TaskDetail.native.tsx`, `src/navigation/storybook.native.ts`, `mobile/index.js`, `mobile/App.native.tsx`.
- `src/lib/scaffold/templates/desktop.ts` — `src/native/greeter.service.ts`, `desktop/package.json`, `desktop/webpack.rules.ts`, `desktop/src/renderer/index.html`, `desktop/src/renderer/index.ts`; re-exports the existing `renderForgeConfig`/`renderWebpackMain`/`renderWebpackRenderer`/`renderMainTs`/`renderPreloadTs` from `src/lib/desktop/templates.ts`.
- `src/lib/scaffold/plan.ts` — `buildScaffoldPlan(opts): ScaffoldFile[]` (pure assembly by target).
- `src/lib/scaffold/init.ts` — `initApp(opts): Promise<number>` (resolve → write → post-steps).
- `src/commands/init.ts` — `sublime init` command wrapper.
- `src/index.ts` — **modify** to `export { initApp } from './lib/scaffold/init.js'` and re-export the scaffold types so `@sublime-ui/create-app` can consume them.
- `src/cli.ts` — **modify** to register `init`.
- Tests under `devkit/test/scaffold/` and `devkit/test/commands/init.test.ts`, plus `devkit/test/e2e/create-app.e2e.test.ts`.

**New package `@sublime-ui/create-app`** (workspace `create-app/`):
- `package.json`, `tsconfig.json`, `tsup.config.ts`, `LICENSE`, `README.md`.
- `src/index.ts` — bin: parse argv → call `initApp` from `@sublime-ui/devkit`.
- `test/argv.test.ts` — argv → `ScaffoldOptions` mapping.

**Repo wiring:**
- root `package.json` workspaces — add `create-app`.
- `.changeset/config.json` fixed group — add `@sublime-ui/create-app`.
- `website/docs/getting-started/installation.md` — **modify** to lead with `npm create`.

---

### Task 1: Scaffold types + version constant

**Files:**
- Create: `devkit/src/lib/scaffold/types.ts`
- Create: `devkit/src/lib/scaffold/versions.ts`
- Test: `devkit/test/scaffold/versions.test.ts`

**Interfaces:**
- Produces: `type Target = 'web' | 'mobile' | 'desktop'`; `interface ScaffoldFile { path: string; contents: string }`; `interface ScaffoldOptions { dir: string; name?: string; targets?: Target[]; force?: boolean; install?: boolean; git?: boolean; yes?: boolean }`; `interface ResolvedOptions { dir: string; name: string; targets: Target[]; force: boolean; install: boolean; git: boolean }`; `const SUBLIME_VERSIONS: Record<'framework'|'library'|'ui'|'desktop', string>`; `const PEER_VERSIONS: Record<string,string>`.

- [ ] **Step 1: Write the failing test**

```ts
// devkit/test/scaffold/versions.test.ts
import { describe, it, expect } from 'vitest';
import { SUBLIME_VERSIONS, PEER_VERSIONS } from '../../src/lib/scaffold/versions.js';

describe('versions', () => {
  it('pins all four @sublime-ui packages with a caret range', () => {
    for (const k of ['framework', 'library', 'ui', 'desktop'] as const) {
      expect(SUBLIME_VERSIONS[k]).toMatch(/^\^\d+\.\d+\.\d+$/);
    }
  });
  it('provides peer ranges for the web and mobile runtimes', () => {
    expect(PEER_VERSIONS['@mui/material']).toBeTruthy();
    expect(PEER_VERSIONS['react-native']).toBeTruthy();
    expect(PEER_VERSIONS['react']).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @sublime-ui/devkit -- versions`
Expected: FAIL — cannot find module `versions.js`.

- [ ] **Step 3: Write the types**

```ts
// devkit/src/lib/scaffold/types.ts
export type Target = 'web' | 'mobile' | 'desktop';

export interface ScaffoldFile {
  /** Path relative to the app root, POSIX-style. */
  path: string;
  contents: string;
}

export interface ScaffoldOptions {
  dir: string;
  name?: string;
  targets?: Target[];
  force?: boolean;
  install?: boolean;
  git?: boolean;
  yes?: boolean;
}

export interface ResolvedOptions {
  dir: string;
  name: string;
  targets: Target[];
  force: boolean;
  install: boolean;
  git: boolean;
}
```

- [ ] **Step 4: Write the versions constant**

```ts
// devkit/src/lib/scaffold/versions.ts
/** Published @sublime-ui ranges the generated app depends on. Bump here on release. */
export const SUBLIME_VERSIONS = {
  framework: '^0.1.0',
  library: '^0.1.0',
  ui: '^0.1.0',
  desktop: '^0.1.0',
} as const;

/** Peer runtimes the generated app installs, by target. */
export const PEER_VERSIONS: Record<string, string> = {
  react: '^18.3.1',
  'react-dom': '^18.3.1',
  '@mui/material': '^6.1.6',
  '@emotion/react': '^11.13.3',
  '@emotion/styled': '^11.13.0',
  'react-router-dom': '^6.27.0',
  'react-native': '^0.76.1',
  'react-native-paper': '^5.12.5',
  'react-native-safe-area-context': '^4.14.0',
  '@react-navigation/native': '^6.1.18',
  '@react-navigation/native-stack': '^6.11.0',
  '@react-navigation/bottom-tabs': '^6.6.1',
  electron: '^33.0.0',
  vite: '^5.4.0',
  '@vitejs/plugin-react': '^4.3.0',
  typescript: '^5.6.0',
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -w @sublime-ui/devkit -- versions`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add devkit/src/lib/scaffold/types.ts devkit/src/lib/scaffold/versions.ts devkit/test/scaffold/versions.test.ts
git commit -m "feat(devkit): scaffold types + pinned version constants"
```

---

### Task 2: App-level templates (package.json, config, tsconfig, gitignore, README)

**Files:**
- Create: `devkit/src/lib/scaffold/templates/app.ts`
- Test: `devkit/test/scaffold/app-templates.test.ts`

**Interfaces:**
- Consumes: `Target`, `SUBLIME_VERSIONS`, `PEER_VERSIONS`.
- Produces: `renderAppPackageJson(name: string, targets: Target[]): string`; `renderSublimeConfig(targets: Target[]): string`; `renderTsconfig(): string`; `renderGitignore(): string`; `renderAppReadme(name: string, targets: Target[]): string`.

- [ ] **Step 1: Write the failing test**

```ts
// devkit/test/scaffold/app-templates.test.ts
import { describe, it, expect } from 'vitest';
import {
  renderAppPackageJson, renderSublimeConfig, renderTsconfig, renderGitignore, renderAppReadme,
} from '../../src/lib/scaffold/templates/app.js';

describe('app templates', () => {
  it('package.json pins @sublime-ui deps and adds target scripts', () => {
    const pkg = JSON.parse(renderAppPackageJson('my-app', ['web', 'mobile', 'desktop']));
    expect(pkg.name).toBe('my-app');
    expect(pkg.private).toBe(true);
    expect(pkg.dependencies['@sublime-ui/framework']).toMatch(/^\^/);
    expect(pkg.dependencies['@sublime-ui/desktop']).toMatch(/^\^/);
    expect(pkg.scripts['dev:web']).toContain('vite');
    expect(pkg.scripts['build:nav']).toBe('sublime build:nav');
    expect(pkg.scripts['desktop:dev']).toBe('sublime desktop:dev');
  });
  it('package.json omits desktop dep + scripts when desktop not selected', () => {
    const pkg = JSON.parse(renderAppPackageJson('my-app', ['web']));
    expect(pkg.dependencies['@sublime-ui/desktop']).toBeUndefined();
    expect(pkg.scripts['desktop:dev']).toBeUndefined();
    expect(pkg.dependencies['react-native']).toBeUndefined();
  });
  it('sublime.config.json includes a desktop block only with desktop', () => {
    expect(JSON.parse(renderSublimeConfig(['web'])).desktop).toBeUndefined();
    expect(JSON.parse(renderSublimeConfig(['web', 'desktop'])).desktop).toEqual({ dir: 'desktop' });
  });
  it('tsconfig + gitignore + readme render non-empty', () => {
    expect(renderTsconfig()).toContain('"strict": true');
    expect(renderGitignore()).toContain('node_modules');
    expect(renderGitignore()).toContain('navigation.web.tsx'); // generated nav is ignored
    expect(renderAppReadme('my-app', ['web'])).toContain('my-app');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @sublime-ui/devkit -- app-templates`
Expected: FAIL — cannot find module `app.js`.

- [ ] **Step 3: Implement the app templates**

```ts
// devkit/src/lib/scaffold/templates/app.ts
import type { Target } from '../types.js';
import { SUBLIME_VERSIONS, PEER_VERSIONS } from '../versions.js';

const has = (targets: Target[], t: Target): boolean => targets.includes(t);

export function renderAppPackageJson(name: string, targets: Target[]): string {
  const deps: Record<string, string> = {
    '@sublime-ui/framework': SUBLIME_VERSIONS.framework,
    '@sublime-ui/library': SUBLIME_VERSIONS.library,
    '@sublime-ui/ui': SUBLIME_VERSIONS.ui,
    react: PEER_VERSIONS['react']!,
  };
  const devDeps: Record<string, string> = {
    '@sublime-ui/devkit': SUBLIME_VERSIONS.framework, // shares the lockstep version
    typescript: PEER_VERSIONS['typescript']!,
    '@types/react': '^18.3.12',
  };
  const scripts: Record<string, string> = { 'build:nav': 'sublime build:nav' };

  if (has(targets, 'web') || has(targets, 'desktop')) {
    deps['react-dom'] = PEER_VERSIONS['react-dom']!;
    deps['react-router-dom'] = PEER_VERSIONS['react-router-dom']!;
    deps['@mui/material'] = PEER_VERSIONS['@mui/material']!;
    deps['@emotion/react'] = PEER_VERSIONS['@emotion/react']!;
    deps['@emotion/styled'] = PEER_VERSIONS['@emotion/styled']!;
    devDeps['vite'] = PEER_VERSIONS['vite']!;
    devDeps['@vitejs/plugin-react'] = PEER_VERSIONS['@vitejs/plugin-react']!;
    scripts['dev:web'] = 'vite';
    scripts['build:web'] = 'vite build';
  }
  if (has(targets, 'mobile')) {
    deps['react-native'] = PEER_VERSIONS['react-native']!;
    deps['react-native-paper'] = PEER_VERSIONS['react-native-paper']!;
    deps['react-native-safe-area-context'] = PEER_VERSIONS['react-native-safe-area-context']!;
    deps['@react-navigation/native'] = PEER_VERSIONS['@react-navigation/native']!;
    deps['@react-navigation/native-stack'] = PEER_VERSIONS['@react-navigation/native-stack']!;
    deps['@react-navigation/bottom-tabs'] = PEER_VERSIONS['@react-navigation/bottom-tabs']!;
    scripts['dev:mobile'] = 'sublime build --debug';
    scripts['build:mobile'] = 'sublime build';
  }
  if (has(targets, 'desktop')) {
    deps['@sublime-ui/desktop'] = SUBLIME_VERSIONS.desktop;
    devDeps['electron'] = PEER_VERSIONS['electron']!;
    scripts['desktop:dev'] = 'sublime desktop:dev';
    scripts['desktop:build'] = 'sublime desktop:build';
  }

  const pkg = {
    name,
    version: '0.0.0',
    private: true,
    type: 'module',
    scripts,
    dependencies: deps,
    devDependencies: devDeps,
  };
  return JSON.stringify(pkg, null, 2) + '\n';
}

export function renderSublimeConfig(targets: Target[]): string {
  const cfg: Record<string, unknown> = {
    modelsDir: 'src/models',
    componentsDir: 'src/components',
    themeDir: 'src/theme',
    navigationDir: 'src/navigation',
    importAlias: '@sublime-ui',
  };
  if (has(targets, 'desktop')) cfg['desktop'] = { dir: 'desktop' };
  return JSON.stringify(cfg, null, 2) + '\n';
}

export function renderTsconfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        jsx: 'react-jsx',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        noUncheckedIndexedAccess: true,
        types: ['react'],
      },
      include: ['src', 'web', 'mobile', 'desktop'],
    },
    null,
    2,
  ) + '\n';
}

export function renderGitignore(): string {
  return [
    'node_modules',
    'dist',
    'build',
    '.DS_Store',
    '',
    '# Generated by `sublime build:nav`',
    'src/navigation/navigation.web.tsx',
    'src/navigation/navigation.native.tsx',
    'src/navigation/routes.d.ts',
    'src/navigation/index.ts',
    '',
    '# Native build output',
    'android',
    'ios',
    '',
  ].join('\n');
}

export function renderAppReadme(name: string, targets: Target[]): string {
  const lines = [
    `# ${name}`,
    '',
    'A [Sublime UI](https://sublime-ui.github.io/sublime-ui/) app — write the',
    'non-UI parts once, run on mobile, web, and desktop.',
    '',
    '## Getting started',
    '',
    '```bash',
    'npm install',
    'npm run build:nav   # compile navigation',
  ];
  if (has(targets, 'web')) lines.push('npm run dev:web     # web (Vite)');
  if (has(targets, 'mobile')) lines.push('npm run dev:mobile  # Android (debug)');
  if (has(targets, 'desktop')) lines.push('npm run desktop:dev # Electron');
  lines.push('```', '');
  return lines.join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w @sublime-ui/devkit -- app-templates`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add devkit/src/lib/scaffold/templates/app.ts devkit/test/scaffold/app-templates.test.ts
git commit -m "feat(devkit): app-level scaffold templates (package.json/config/tsconfig)"
```

---

### Task 3: Shared src templates (Task model + theme)

**Files:**
- Create: `devkit/src/lib/scaffold/templates/shared.ts`
- Test: `devkit/test/scaffold/shared-templates.test.ts`

**Interfaces:**
- Produces: `renderTaskModel(): string`; `renderModelsBarrel(): string`; `renderThemeTokensJson(): string`; `renderThemeTokensTs(): string`.

- [ ] **Step 1: Write the failing test**

```ts
// devkit/test/scaffold/shared-templates.test.ts
import { describe, it, expect } from 'vitest';
import {
  renderTaskModel, renderModelsBarrel, renderThemeTokensJson, renderThemeTokensTs,
} from '../../src/lib/scaffold/templates/shared.js';

describe('shared templates', () => {
  it('Task model extends Model and registers itself', () => {
    const src = renderTaskModel();
    expect(src).toContain("from '@sublime-ui/framework'");
    expect(src).toContain('export class Task extends Model');
    expect(src).toContain('registerModel(Task)');
    expect(src).toContain("resource = '/tasks'");
  });
  it('models barrel re-exports Task', () => {
    expect(renderModelsBarrel()).toContain("export * from './Task.js'");
  });
  it('theme tokens render valid JSON + a typed wrapper', () => {
    expect(() => JSON.parse(renderThemeTokensJson())).not.toThrow();
    expect(renderThemeTokensTs()).toContain('export const tokens');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @sublime-ui/devkit -- shared-templates`
Expected: FAIL — cannot find module `shared.js`.

- [ ] **Step 3: Implement the shared templates**

```ts
// devkit/src/lib/scaffold/templates/shared.ts
export function renderTaskModel(): string {
  return `import { Model, registerModel } from '@sublime-ui/framework';

/** A sample model. Replace with your own — see the docs on the Model layer. */
export class Task extends Model {
  protected static resource = '/tasks';
  declare id: number;
  declare name: string;
  declare done: boolean;
}
registerModel(Task);
`;
}

export function renderModelsBarrel(): string {
  return `export * from './Task.js';
`;
}

export function renderThemeTokensJson(): string {
  // Minimal token set; \`sublime theme:init\` can later replace this with the
  // library defaults. Kept tiny and serializable on purpose.
  return JSON.stringify(
    {
      colors: { primary: '#4F46E5', background: '#FFFFFF', text: '#111827' },
      spacing: { sm: 8, md: 16, lg: 24 },
      radius: { md: 12 },
    },
    null,
    2,
  ) + '\n';
}

export function renderThemeTokensTs(): string {
  return `import tokensJson from './tokens.json' with { type: 'json' };
import type { SublimeTokens } from '@sublime-ui/library';

/** Typed app design tokens. Edit tokens.json; this stays a thin typed wrapper. */
export const tokens = tokensJson as unknown as SublimeTokens;
`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w @sublime-ui/devkit -- shared-templates`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add devkit/src/lib/scaffold/templates/shared.ts devkit/test/scaffold/shared-templates.test.ts
git commit -m "feat(devkit): shared scaffold templates (Task model + theme)"
```

> **Note for implementer:** verified against source — `@sublime-ui/library` exports the `SublimeTokens` type from its root (`library/src/index.ts`), and `SublimeProvider` takes a `tokens` prop. The e2e typecheck (Task 11) is the backstop if a published API drifts.

---

### Task 4: Web target templates

**Files:**
- Create: `devkit/src/lib/scaffold/templates/web.ts`
- Test: `devkit/test/scaffold/web-templates.test.ts`

**Interfaces:**
- Produces: `renderWebTaskList(): string`; `renderWebTaskDetail(): string`; `renderStorybookWeb(): string`; `renderWebIndexHtml(name: string): string`; `renderWebMain(): string`; `renderViteConfig(): string`.

- [ ] **Step 1: Write the failing test**

```ts
// devkit/test/scaffold/web-templates.test.ts
import { describe, it, expect } from 'vitest';
import {
  renderWebTaskList, renderWebTaskDetail, renderStorybookWeb,
  renderWebIndexHtml, renderWebMain, renderViteConfig,
} from '../../src/lib/scaffold/templates/web.js';

describe('web templates', () => {
  it('TaskList reads the model reactively and links to detail', () => {
    const src = renderWebTaskList();
    expect(src).toContain("from '@sublime-ui/ui'");
    expect(src).toContain('Task.rxAll()');
    expect(src).toContain('useNav()');
  });
  it('TaskDetail reads a typed id param', () => {
    expect(renderWebTaskDetail()).toContain("params<{ id: number }>()");
  });
  it('storybook.web uses a web format and 2 pages', () => {
    const src = renderStorybookWeb();
    expect(src).toContain("from '@sublime-ui/ui/navigation'");
    expect(src).toContain("format: 'sidebar'");
    expect(src).toContain('page<{ id: number }>');
  });
  it('web entry mounts the provider + generated Navigation', () => {
    expect(renderWebMain()).toContain('SublimeProvider');
    expect(renderWebMain()).toContain('Navigation');
    expect(renderWebIndexHtml('my-app')).toContain('my-app');
    expect(renderViteConfig()).toContain('@vitejs/plugin-react');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @sublime-ui/devkit -- web-templates`
Expected: FAIL — cannot find module `web.js`.

- [ ] **Step 3: Implement the web templates**

```ts
// devkit/src/lib/scaffold/templates/web.ts
export function renderWebTaskList(): string {
  return `import { Screen, Stack } from '@sublime-ui/ui';
import { useNav } from '@sublime-ui/ui/navigation';
import { Task } from '../../models/Task';

export function TaskList() {
  const tasks = Task.rxAll();
  const nav = useNav();
  return (
    <Screen>
      <Stack>
        {tasks.map((t) => (
          <button key={t.id} onClick={() => nav.turnTo('task', { id: t.id })}>
            {t.name}
          </button>
        ))}
      </Stack>
    </Screen>
  );
}
`;
}

export function renderWebTaskDetail(): string {
  return `import { Screen, Stack } from '@sublime-ui/ui';
import { useNav } from '@sublime-ui/ui/navigation';
import { Task } from '../../models/Task';

export function TaskDetail() {
  const nav = useNav();
  const { id } = nav.params<{ id: number }>();
  const task = Task.rxFind(id);
  return (
    <Screen>
      <Stack>
        <h1>{task?.name ?? 'Loading…'}</h1>
        <button onClick={() => nav.turnBack()}>Back</button>
      </Stack>
    </Screen>
  );
}
`;
}

export function renderStorybookWeb(): string {
  return `import { book, page } from '@sublime-ui/ui/navigation';
import { TaskList } from '../screens/web/TaskList';
import { TaskDetail } from '../screens/web/TaskDetail';

export default book({
  format: 'sidebar', // web: 'sidebar' | 'stack' | 'tabs'
  pages: {
    tasks: page(TaskList, { title: 'Tasks', initial: true }),
    task: page<{ id: number }>(TaskDetail, { title: 'Task' }),
  },
});
`;
}

export function renderWebIndexHtml(name: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/web/main.tsx"></script>
  </body>
</html>
`;
}

export function renderWebMain(): string {
  return `import React from 'react';
import { createRoot } from 'react-dom/client';
import { SublimeProvider } from '@sublime-ui/library';
import { Navigation } from '../src/navigation';
import { tokens } from '../src/theme/tokens';

function App() {
  return (
    <SublimeProvider tokens={tokens}>
      <Navigation />
    </SublimeProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`;
}

export function renderViteConfig(): string {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w @sublime-ui/devkit -- web-templates`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add devkit/src/lib/scaffold/templates/web.ts devkit/test/scaffold/web-templates.test.ts
git commit -m "feat(devkit): web target scaffold templates"
```

> **Note for implementer:** verified against source — `Model` exposes static `rxAll()` and `rxFind(id)` (`framework/src/model/Model.ts`); `useNav()` returns `{ turnTo, turnBack, params<T>() }` (`ui/src/navigation/nav.types.ts`); the page `initial?: boolean` option exists (`ui/src/navigation/types.ts`). **Import boundary (important): `Screen`/`Stack` come from `@sublime-ui/ui`, but `useNav` and `book`/`page` come from `@sublime-ui/ui/navigation`** — the templates split these imports accordingly.

---

### Task 5: Mobile target templates

**Files:**
- Create: `devkit/src/lib/scaffold/templates/mobile.ts`
- Test: `devkit/test/scaffold/mobile-templates.test.ts`

**Interfaces:**
- Produces: `renderMobileTaskList(): string`; `renderMobileTaskDetail(): string`; `renderStorybookNative(): string`; `renderMobileEntry(): string`; `renderMobileApp(): string`.

- [ ] **Step 1: Write the failing test**

```ts
// devkit/test/scaffold/mobile-templates.test.ts
import { describe, it, expect } from 'vitest';
import {
  renderMobileTaskList, renderMobileTaskDetail, renderStorybookNative,
  renderMobileEntry, renderMobileApp,
} from '../../src/lib/scaffold/templates/mobile.js';

describe('mobile templates', () => {
  it('mobile screens use Paper Text and the model', () => {
    expect(renderMobileTaskList()).toContain("from 'react-native-paper'");
    expect(renderMobileTaskList()).toContain('Task.rxAll()');
    expect(renderMobileTaskDetail()).toContain("params<{ id: number }>()");
  });
  it('storybook.native uses a mobile format', () => {
    const src = renderStorybookNative();
    expect(src).toContain("format: 'bottomNav'");
    expect(src).toContain("from '@sublime-ui/ui/navigation'");
  });
  it('mobile entry registers the app component', () => {
    expect(renderMobileEntry()).toContain('AppRegistry');
    expect(renderMobileApp()).toContain('SublimeProvider');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @sublime-ui/devkit -- mobile-templates`
Expected: FAIL — cannot find module `mobile.js`.

- [ ] **Step 3: Implement the mobile templates**

```ts
// devkit/src/lib/scaffold/templates/mobile.ts
export function renderMobileTaskList(): string {
  return `import { Screen, Stack } from '@sublime-ui/ui';
import { useNav } from '@sublime-ui/ui/navigation';
import { Text, Button } from 'react-native-paper';
import { Task } from '../../models/Task';

export function TaskList() {
  const tasks = Task.rxAll();
  const nav = useNav();
  return (
    <Screen>
      <Stack>
        {tasks.map((t) => (
          <Button key={t.id} onPress={() => nav.turnTo('task', { id: t.id })}>
            {t.name}
          </Button>
        ))}
      </Stack>
    </Screen>
  );
}
`;
}

export function renderMobileTaskDetail(): string {
  return `import { Screen, Stack } from '@sublime-ui/ui';
import { useNav } from '@sublime-ui/ui/navigation';
import { Text, Button } from 'react-native-paper';
import { Task } from '../../models/Task';

export function TaskDetail() {
  const nav = useNav();
  const { id } = nav.params<{ id: number }>();
  const task = Task.rxFind(id);
  return (
    <Screen>
      <Stack>
        <Text variant="headlineMedium">{task?.name ?? 'Loading…'}</Text>
        <Button onPress={() => nav.turnBack()}>Back</Button>
      </Stack>
    </Screen>
  );
}
`;
}

export function renderStorybookNative(): string {
  return `import { book, page } from '@sublime-ui/ui/navigation';
import { TaskList } from '../screens/mobile/TaskList.native';
import { TaskDetail } from '../screens/mobile/TaskDetail.native';

export default book({
  format: 'bottomNav', // mobile: 'drawer' | 'stack' | 'bottomNav' (<= 5 pages)
  pages: {
    tasks: page(TaskList, { title: 'Tasks', icon: 'format-list-bulleted', initial: true }),
    task: page<{ id: number }>(TaskDetail, { title: 'Task', icon: 'note' }),
  },
});
`;
}

export function renderMobileEntry(): string {
  return `import { AppRegistry } from 'react-native';
import { App } from './App.native';
import { name as appName } from '../app.json';

AppRegistry.registerComponent(appName, () => App);
`;
}

export function renderMobileApp(): string {
  return `import { SublimeProvider } from '@sublime-ui/library';
import { Navigation } from '../src/navigation';
import { tokens } from '../src/theme/tokens';

export function App() {
  return (
    <SublimeProvider tokens={tokens}>
      <Navigation />
    </SublimeProvider>
  );
}
`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w @sublime-ui/devkit -- mobile-templates`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add devkit/src/lib/scaffold/templates/mobile.ts devkit/test/scaffold/mobile-templates.test.ts
git commit -m "feat(devkit): mobile target scaffold templates"
```

> **Note for implementer:** `renderMobileEntry` imports `../app.json` for the RN app name — add an `app.json` (`{ "name": "<appName>" }`) to the mobile file set in Task 7's `buildScaffoldPlan` (mobile branch). The mobile target's offline build is driven by `sublime build` (devkit #1) which runs `expo prebuild` if `android/` is absent.

---

### Task 6: Desktop target templates

**Files:**
- Create: `devkit/src/lib/scaffold/templates/desktop.ts`
- Test: `devkit/test/scaffold/desktop-templates.test.ts`

**Interfaces:**
- Consumes: existing `renderForgeConfig`, `renderWebpackMain`, `renderWebpackRenderer`, `renderMainTs`, `renderPreloadTs` from `src/lib/desktop/templates.js`.
- Produces: `renderGreeterService(): string`; `renderDesktopPackageJson(name: string): string`; `renderWebpackRules(): string`; `renderRendererIndexHtml(name: string): string`; `renderRendererIndexTs(): string`; and re-exports of the five existing renderers.

- [ ] **Step 1: Write the failing test**

```ts
// devkit/test/scaffold/desktop-templates.test.ts
import { describe, it, expect } from 'vitest';
import {
  renderGreeterService, renderDesktopPackageJson, renderWebpackRules,
  renderRendererIndexHtml, renderRendererIndexTs, renderForgeConfig,
} from '../../src/lib/scaffold/templates/desktop.js';

describe('desktop templates', () => {
  it('greeter service defines + can be registered', () => {
    const src = renderGreeterService();
    expect(src).toContain("from '@sublime-ui/desktop'");
    expect(src).toContain("defineNative('greeter'");
  });
  it('desktop package.json wires forge + electron', () => {
    const pkg = JSON.parse(renderDesktopPackageJson('my-app'));
    expect(pkg.devDependencies['electron']).toBeTruthy();
    expect(pkg.devDependencies['@electron-forge/cli']).toBeTruthy();
    expect(pkg.scripts['start']).toContain('electron-forge');
  });
  it('renderer entry mounts the web app and webpack rules render', () => {
    expect(renderRendererIndexTs()).toContain('main.tsx');
    expect(renderRendererIndexHtml('my-app')).toContain('root');
    expect(renderWebpackRules()).toContain('ts-loader');
    expect(renderForgeConfig()).toContain('WebpackPlugin'); // re-export works
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @sublime-ui/devkit -- desktop-templates`
Expected: FAIL — cannot find module `desktop.js`.

- [ ] **Step 3: Implement the desktop templates**

```ts
// devkit/src/lib/scaffold/templates/desktop.ts
import { PEER_VERSIONS } from '../versions.js';

export {
  renderForgeConfig, renderWebpackMain, renderWebpackRenderer, renderMainTs, renderPreloadTs,
} from '../../desktop/templates.js';

export function renderGreeterService(): string {
  return `import { defineNative } from '@sublime-ui/desktop';

/** A sample native service. Runs in the main process; the renderer calls it via useNative. */
export const greeter = defineNative('greeter', {
  async hello(name: string): Promise<string> {
    return \`Hello from the desktop main process, \${name}!\`;
  },
});
`;
}

export function renderDesktopPackageJson(name: string): string {
  const pkg = {
    name: \`\${name}-desktop\`,
    version: '0.0.0',
    private: true,
    main: '.webpack/main',
    scripts: {
      start: 'electron-forge start',
      package: 'electron-forge package',
      make: 'electron-forge make',
    },
    devDependencies: {
      '@electron-forge/cli': '^7.5.0',
      '@electron-forge/maker-deb': '^7.5.0',
      '@electron-forge/maker-rpm': '^7.5.0',
      '@electron-forge/maker-squirrel': '^7.5.0',
      '@electron-forge/maker-zip': '^7.5.0',
      '@electron-forge/plugin-auto-unpack-natives': '^7.5.0',
      '@electron-forge/plugin-fuses': '^7.5.0',
      '@electron-forge/plugin-webpack': '^7.5.0',
      '@electron/fuses': '^1.8.0',
      '@vercel/webpack-asset-relocator-loader': '^1.7.3',
      css-loader: '^7.1.2',
      electron: PEER_VERSIONS['electron']!,
      'node-loader': '^2.0.0',
      'style-loader': '^4.0.0',
      'ts-loader': '^9.5.1',
      typescript: PEER_VERSIONS['typescript']!,
    },
    dependencies: {
      '@sublime-ui/desktop': '^0.1.0',
    },
  };
  return JSON.stringify(pkg, null, 2) + '\n';
}

export function renderWebpackRules(): string {
  return `import type { ModuleOptions } from 'webpack';

export const rules: Required<ModuleOptions>['rules'] = [
  { test: /native_modules[/\\\\].+\\.node$/, use: 'node-loader' },
  {
    test: /[/\\\\]node_modules[/\\\\].+\\.(m?js|node)$/,
    parser: { amd: false },
    use: {
      loader: '@vercel/webpack-asset-relocator-loader',
      options: { outputAssetBase: 'native_modules' },
    },
  },
  {
    test: /\\.tsx?$/,
    exclude: /(node_modules|\\.webpack)/,
    use: { loader: 'ts-loader', options: { transpileOnly: true } },
  },
  { test: /\\.css$/, use: ['style-loader', 'css-loader'] },
];
`;
}

export function renderRendererIndexHtml(name: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${name}</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;
}

export function renderRendererIndexTs(): string {
  // The desktop renderer mounts the same web entry as the web target.
  return `import '../../../web/main.tsx';
`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w @sublime-ui/devkit -- desktop-templates`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add devkit/src/lib/scaffold/templates/desktop.ts devkit/test/scaffold/desktop-templates.test.ts
git commit -m "feat(devkit): desktop target scaffold templates"
```

> **Note for implementer:** the re-export path `'../../desktop/templates.js'` is relative from `src/lib/scaffold/templates/desktop.ts` to `src/lib/desktop/templates.ts` — confirm the depth (`scaffold/templates/` → up to `lib/` is `../../`). Adjust if tsc reports an unresolved import.

---

### Task 7: `buildScaffoldPlan` — pure assembly by target

**Files:**
- Create: `devkit/src/lib/scaffold/plan.ts`
- Test: `devkit/test/scaffold/plan.test.ts`

**Interfaces:**
- Consumes: all template renderers; `ResolvedOptions`, `ScaffoldFile`, `Target`.
- Produces: `buildScaffoldPlan(opts: { name: string; targets: Target[] }): ScaffoldFile[]`.

- [ ] **Step 1: Write the failing test**

```ts
// devkit/test/scaffold/plan.test.ts
import { describe, it, expect } from 'vitest';
import { buildScaffoldPlan } from '../../src/lib/scaffold/plan.js';

const paths = (targets: Parameters<typeof buildScaffoldPlan>[0]['targets']) =>
  buildScaffoldPlan({ name: 'my-app', targets }).map((f) => f.path).sort();

describe('buildScaffoldPlan', () => {
  it('always emits the shared core + app files', () => {
    const p = paths(['web']);
    expect(p).toContain('package.json');
    expect(p).toContain('sublime.config.json');
    expect(p).toContain('tsconfig.json');
    expect(p).toContain('src/models/Task.ts');
    expect(p).toContain('src/theme/tokens.json');
    expect(p).toContain('src/theme/tokens.ts');
  });
  it('web target adds web screens, storybook.web, and the web entry', () => {
    const p = paths(['web']);
    expect(p).toContain('src/screens/web/TaskList.tsx');
    expect(p).toContain('src/screens/web/TaskDetail.tsx');
    expect(p).toContain('src/navigation/storybook.web.ts');
    expect(p).toContain('web/main.tsx');
    expect(p).toContain('vite.config.ts');
    expect(p).not.toContain('src/screens/mobile/TaskList.native.tsx');
  });
  it('mobile target adds native screens, storybook.native, app.json, and the RN entry', () => {
    const p = paths(['mobile']);
    expect(p).toContain('src/screens/mobile/TaskList.native.tsx');
    expect(p).toContain('src/navigation/storybook.native.ts');
    expect(p).toContain('mobile/App.native.tsx');
    expect(p).toContain('app.json');
  });
  it('desktop target adds the greeter service + desktop shell + reuses web', () => {
    const p = paths(['web', 'desktop']);
    expect(p).toContain('src/native/greeter.service.ts');
    expect(p).toContain('desktop/forge.config.ts');
    expect(p).toContain('desktop/src/main/main.ts');
    expect(p).toContain('desktop/src/renderer/index.ts');
    expect(p).toContain('web/main.tsx'); // desktop renders the web UI
  });
  it('produces no duplicate paths for the all-three combo', () => {
    const all = buildScaffoldPlan({ name: 'my-app', targets: ['web', 'mobile', 'desktop'] });
    const seen = new Set(all.map((f) => f.path));
    expect(seen.size).toBe(all.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @sublime-ui/devkit -- plan`
Expected: FAIL — cannot find module `plan.js`.

- [ ] **Step 3: Implement `buildScaffoldPlan`**

```ts
// devkit/src/lib/scaffold/plan.ts
import type { ScaffoldFile, Target } from './types.js';
import {
  renderAppPackageJson, renderSublimeConfig, renderTsconfig, renderGitignore, renderAppReadme,
} from './templates/app.js';
import {
  renderTaskModel, renderModelsBarrel, renderThemeTokensJson, renderThemeTokensTs,
} from './templates/shared.js';
import {
  renderWebTaskList, renderWebTaskDetail, renderStorybookWeb,
  renderWebIndexHtml, renderWebMain, renderViteConfig,
} from './templates/web.js';
import {
  renderMobileTaskList, renderMobileTaskDetail, renderStorybookNative,
  renderMobileEntry, renderMobileApp,
} from './templates/mobile.js';
import {
  renderGreeterService, renderDesktopPackageJson, renderWebpackRules,
  renderRendererIndexHtml, renderRendererIndexTs,
  renderForgeConfig, renderWebpackMain, renderWebpackRenderer, renderMainTs, renderPreloadTs,
} from './templates/desktop.js';

const has = (t: Target[], x: Target): boolean => t.includes(x);

export function buildScaffoldPlan(opts: { name: string; targets: Target[] }): ScaffoldFile[] {
  const { name, targets } = opts;
  const files: ScaffoldFile[] = [
    { path: 'package.json', contents: renderAppPackageJson(name, targets) },
    { path: 'sublime.config.json', contents: renderSublimeConfig(targets) },
    { path: 'tsconfig.json', contents: renderTsconfig() },
    { path: '.gitignore', contents: renderGitignore() },
    { path: 'README.md', contents: renderAppReadme(name, targets) },
    { path: 'src/models/Task.ts', contents: renderTaskModel() },
    { path: 'src/models/index.ts', contents: renderModelsBarrel() },
    { path: 'src/theme/tokens.json', contents: renderThemeTokensJson() },
    { path: 'src/theme/tokens.ts', contents: renderThemeTokensTs() },
  ];

  if (has(targets, 'web') || has(targets, 'desktop')) {
    files.push(
      { path: 'src/screens/web/TaskList.tsx', contents: renderWebTaskList() },
      { path: 'src/screens/web/TaskDetail.tsx', contents: renderWebTaskDetail() },
      { path: 'src/navigation/storybook.web.ts', contents: renderStorybookWeb() },
      { path: 'web/index.html', contents: renderWebIndexHtml(name) },
      { path: 'web/main.tsx', contents: renderWebMain() },
      { path: 'vite.config.ts', contents: renderViteConfig() },
    );
  }

  if (has(targets, 'mobile')) {
    files.push(
      { path: 'src/screens/mobile/TaskList.native.tsx', contents: renderMobileTaskList() },
      { path: 'src/screens/mobile/TaskDetail.native.tsx', contents: renderMobileTaskDetail() },
      { path: 'src/navigation/storybook.native.ts', contents: renderStorybookNative() },
      { path: 'mobile/index.js', contents: renderMobileEntry() },
      { path: 'mobile/App.native.tsx', contents: renderMobileApp() },
      { path: 'app.json', contents: JSON.stringify({ name }, null, 2) + '\n' },
    );
  }

  if (has(targets, 'desktop')) {
    files.push(
      { path: 'src/native/greeter.service.ts', contents: renderGreeterService() },
      { path: 'desktop/package.json', contents: renderDesktopPackageJson(name) },
      { path: 'desktop/forge.config.ts', contents: renderForgeConfig() },
      { path: 'desktop/webpack.main.config.ts', contents: renderWebpackMain() },
      { path: 'desktop/webpack.renderer.config.ts', contents: renderWebpackRenderer() },
      { path: 'desktop/webpack.rules.ts', contents: renderWebpackRules() },
      { path: 'desktop/src/main/main.ts', contents: renderMainTs() },
      { path: 'desktop/src/main/preload.ts', contents: renderPreloadTs() },
      { path: 'desktop/src/renderer/index.html', contents: renderRendererIndexHtml(name) },
      { path: 'desktop/src/renderer/index.ts', contents: renderRendererIndexTs() },
    );
  }

  return files;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w @sublime-ui/devkit -- plan`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add devkit/src/lib/scaffold/plan.ts devkit/test/scaffold/plan.test.ts
git commit -m "feat(devkit): assemble the scaffold plan from selected targets"
```

---

### Task 8: `initApp` orchestrator

**Files:**
- Create: `devkit/src/lib/scaffold/init.ts`
- Test: `devkit/test/scaffold/init.test.ts`

**Interfaces:**
- Consumes: `buildScaffoldPlan`, `safeWrite`, `FileExistsError`, `log`, `ScaffoldOptions`, `Target`.
- Produces: `initApp(opts: ScaffoldOptions & { prompt?: Prompt; runner?: PostRunner }): Promise<number>` where `type Prompt = (resolved: { dir: string }) => Promise<{ name: string; targets: Target[] }>` and `type PostRunner = (cmd: string, args: string[], cwd: string) => Promise<number>`. Validation helper `isValidNpmName(s: string): boolean`. Desktop-implies-web enforced.

- [ ] **Step 1: Write the failing test**

```ts
// devkit/test/scaffold/init.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initApp } from '../../src/lib/scaffold/init.js';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'sublime-init-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const noPrompt = async () => ({ name: 'my-app', targets: ['web'] as const });
const okRunner = async () => 0;

describe('initApp', () => {
  it('writes the file set and returns 0 (non-interactive, no install/git)', async () => {
    const app = join(dir, 'my-app');
    const code = await initApp({
      dir: app, name: 'my-app', targets: ['web'], install: false, git: false, yes: true,
      runner: okRunner,
    });
    expect(code).toBe(0);
    expect(existsSync(join(app, 'package.json'))).toBe(true);
    expect(existsSync(join(app, 'src/screens/web/TaskList.tsx'))).toBe(true);
    expect(JSON.parse(readFileSync(join(app, 'package.json'), 'utf8')).name).toBe('my-app');
  });

  it('refuses a non-empty dir without force', async () => {
    const app = join(dir, 'busy');
    mkdirSync(app, { recursive: true });
    writeFileSync(join(app, 'keep.txt'), 'x');
    const code = await initApp({ dir: app, name: 'busy', targets: ['web'], install: false, git: false, yes: true, runner: okRunner });
    expect(code).toBe(1);
    expect(existsSync(join(app, 'package.json'))).toBe(false);
  });

  it('rejects desktop without web', async () => {
    const app = join(dir, 'bad');
    const code = await initApp({ dir: app, name: 'bad', targets: ['desktop'], install: false, git: false, yes: true, runner: okRunner });
    expect(code).toBe(1);
  });

  it('rejects an invalid app name', async () => {
    const app = join(dir, 'X');
    const code = await initApp({ dir: app, name: 'Not A Name', targets: ['web'], install: false, git: false, yes: true, runner: okRunner });
    expect(code).toBe(1);
  });

  it('runs install + build:nav through the runner when install=true', async () => {
    const app = join(dir, 'withpost');
    const calls: string[] = [];
    const code = await initApp({
      dir: app, name: 'withpost', targets: ['web'], install: true, git: false, yes: true,
      runner: async (cmd, args, _cwd) => { calls.push([cmd, ...args].join(' ')); return 0; },
    });
    expect(code).toBe(0);
    expect(calls.some((c) => c.startsWith('npm install'))).toBe(true);
    expect(calls.some((c) => c.includes('build:nav'))).toBe(true);
  });

  it('prompts when name/targets are absent and not --yes', async () => {
    const app = join(dir, 'prompted');
    const code = await initApp({
      dir: app, install: false, git: false,
      prompt: async () => ({ name: 'prompted', targets: ['web'] }),
      runner: okRunner,
    });
    expect(code).toBe(0);
    expect(existsSync(join(app, 'package.json'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @sublime-ui/devkit -- init`
Expected: FAIL — cannot find module `init.js`.

- [ ] **Step 3: Implement `initApp`**

```ts
// devkit/src/lib/scaffold/init.ts
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
  log.info(`Next:  cd ${name}`);
  if (!(opts.install ?? true)) log.info('       npm install && npm run build:nav');
  if (targets.includes('web')) log.info('       npm run dev:web');
  if (targets.includes('mobile')) log.info('       npm run dev:mobile');
  if (targets.includes('desktop')) log.info('       npm run desktop:dev');
  return 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w @sublime-ui/devkit -- init`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add devkit/src/lib/scaffold/init.ts devkit/test/scaffold/init.test.ts
git commit -m "feat(devkit): initApp orchestrator (resolve, write, post-scaffold)"
```

---

### Task 9: `sublime init` command + cli wiring + public export

**Files:**
- Create: `devkit/src/commands/init.ts`
- Modify: `devkit/src/cli.ts` (register `init`)
- Modify: `devkit/src/index.ts` (export `initApp` + scaffold types)
- Test: `devkit/test/commands/init.test.ts`

**Interfaces:**
- Consumes: `initApp`, `@inquirer/prompts` (`input`, `checkbox`, `confirm`).
- Produces: `runInit(opts: { dir: string; name?: string; targets?: string; install: boolean; git: boolean; force: boolean; yes: boolean; prompt?: Prompt; runner?: PostRunner }): Promise<number>` — parses the `--targets a,b` string and supplies an inquirer-backed `prompt`.

- [ ] **Step 1: Write the failing test**

```ts
// devkit/test/commands/init.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInit } from '../../src/commands/init.js';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'init-cmd-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('runInit', () => {
  it('parses --targets and scaffolds without prompting under --yes', async () => {
    const app = join(dir, 'app');
    const code = await runInit({
      dir: app, name: 'app', targets: 'web,desktop',
      install: false, git: false, force: false, yes: true,
      runner: async () => 0,
    });
    expect(code).toBe(0);
    expect(existsSync(join(app, 'desktop/forge.config.ts'))).toBe(true);
    expect(existsSync(join(app, 'web/main.tsx'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @sublime-ui/devkit -- commands/init`
Expected: FAIL — cannot find module `commands/init.js`.

- [ ] **Step 3: Implement the command**

```ts
// devkit/src/commands/init.ts
import { input, checkbox } from '@inquirer/prompts';
import { basename } from 'node:path';
import { initApp, type Prompt, type PostRunner } from '../lib/scaffold/init.js';
import type { Target } from '../lib/scaffold/types.js';

const ALL: Target[] = ['web', 'mobile', 'desktop'];

function parseTargets(spec: string | undefined): Target[] | undefined {
  if (!spec) return undefined;
  const parts = spec.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.filter((p): p is Target => (ALL as string[]).includes(p));
}

const inquirerPrompt: Prompt = async ({ dir }) => {
  const name = await input({ message: 'App name:', default: basename(dir) });
  const targets = (await checkbox({
    message: 'Targets:',
    choices: [
      { name: 'web (Vite + MUI)', value: 'web', checked: true },
      { name: 'mobile (React Native + Paper)', value: 'mobile', checked: true },
      { name: 'desktop (Electron, wraps web)', value: 'desktop', checked: true },
    ],
  })) as Target[];
  return { name, targets };
};

export async function runInit(opts: {
  dir: string;
  name?: string;
  targets?: string;
  install: boolean;
  git: boolean;
  force: boolean;
  yes: boolean;
  prompt?: Prompt;
  runner?: PostRunner;
}): Promise<number> {
  return initApp({
    dir: opts.dir,
    ...(opts.name !== undefined ? { name: opts.name } : {}),
    ...(parseTargets(opts.targets) !== undefined ? { targets: parseTargets(opts.targets) } : {}),
    install: opts.install,
    git: opts.git,
    force: opts.force,
    yes: opts.yes,
    prompt: opts.prompt ?? inquirerPrompt,
    ...(opts.runner !== undefined ? { runner: opts.runner } : {}),
  });
}
```

- [ ] **Step 4: Wire into cli.ts**

Add the import near the other command imports in `devkit/src/cli.ts`:

```ts
import { runInit } from './commands/init.js';
```

Add the command registration (after the `setup` command block):

```ts
program
  .command('init [dir]')
  .description('Scaffold a new Sublime app (web/mobile/desktop)')
  .option('--name <name>', 'app (npm package) name')
  .option('--targets <list>', 'comma-separated: web,mobile,desktop')
  .option('--no-install', 'skip npm install')
  .option('--no-git', 'skip git init')
  .option('--force', 'scaffold into a non-empty directory')
  .option('-y, --yes', 'accept defaults, no prompts')
  .action(async (dir: string | undefined, opts: {
    name?: string; targets?: string; install: boolean; git: boolean; force?: boolean; yes?: boolean;
  }) => {
    process.exit(await runInit({
      dir: dir ?? process.cwd(),
      ...(opts.name !== undefined ? { name: opts.name } : {}),
      ...(opts.targets !== undefined ? { targets: opts.targets } : {}),
      install: opts.install,
      git: opts.git,
      force: opts.force ?? false,
      yes: opts.yes ?? false,
    }));
  });
```

- [ ] **Step 5: Export `initApp` from the devkit public API**

In `devkit/src/index.ts`, add:

```ts
export { initApp, isValidNpmName } from './lib/scaffold/init.js';
export type { Prompt, PostRunner } from './lib/scaffold/init.js';
export type { Target, ScaffoldOptions, ScaffoldFile } from './lib/scaffold/types.js';
```

- [ ] **Step 6: Run tests + typecheck**

Run: `npm test -w @sublime-ui/devkit -- commands/init && npm run typecheck -w @sublime-ui/devkit`
Expected: PASS; typecheck clean.

- [ ] **Step 7: Commit**

```bash
git add devkit/src/commands/init.ts devkit/src/cli.ts devkit/src/index.ts devkit/test/commands/init.test.ts
git commit -m "feat(devkit): sublime init command + public initApp export"
```

> **Note for implementer:** commander's `--no-install` / `--no-git` produce `opts.install` / `opts.git` defaulting to `true`. `exactOptionalPropertyTypes` is on — keep the conditional-spread pattern (`...(x !== undefined ? { x } : {})`) used elsewhere in `cli.ts`.

---

### Task 10: `@sublime-ui/create-app` package

**Files:**
- Create: `create-app/package.json`, `create-app/tsconfig.json`, `create-app/tsup.config.ts`, `create-app/LICENSE`, `create-app/README.md`
- Create: `create-app/src/index.ts`
- Create: `create-app/test/argv.test.ts`
- Modify: root `package.json` (workspaces), `.changeset/config.json` (fixed group)

**Interfaces:**
- Consumes: `initApp`, `Target` from `@sublime-ui/devkit`.
- Produces: `parseArgv(argv: string[]): { dir: string; name?: string; targets?: Target[]; install: boolean; git: boolean; force: boolean; yes: boolean }` (exported for tests) and a bin that calls `initApp`.

- [ ] **Step 1: Write the failing test**

```ts
// create-app/test/argv.test.ts
import { describe, it, expect } from 'vitest';
import { parseArgv } from '../src/index.js';

describe('parseArgv', () => {
  it('takes the first positional as the dir/name', () => {
    const r = parseArgv(['my-app']);
    expect(r.dir.endsWith('my-app')).toBe(true);
  });
  it('parses --targets and flags', () => {
    const r = parseArgv(['my-app', '--targets', 'web,desktop', '--no-install', '--yes']);
    expect(r.targets).toEqual(['web', 'desktop']);
    expect(r.install).toBe(false);
    expect(r.yes).toBe(true);
  });
  it('defaults install/git to true', () => {
    const r = parseArgv(['my-app']);
    expect(r.install).toBe(true);
    expect(r.git).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @sublime-ui/create-app` (will first need the workspace registered — do Step 3/4 then re-run)
Expected: FAIL — package/module not found.

- [ ] **Step 3: Create the package manifest + config**

```jsonc
// create-app/package.json
{
  "name": "@sublime-ui/create-app",
  "version": "0.1.0",
  "description": "Scaffold a new Sublime UI app — npm create @sublime-ui/app my-app.",
  "keywords": ["sublime-ui", "create", "scaffold", "starter", "cross-platform"],
  "homepage": "https://sublime-ui.github.io/sublime-ui/",
  "bugs": "https://github.com/sublime-ui/sublime-ui/issues",
  "repository": { "type": "git", "url": "git+https://github.com/sublime-ui/sublime-ui.git", "directory": "create-app" },
  "license": "MIT",
  "author": "Aaron Mkandawire",
  "publishConfig": { "access": "public" },
  "type": "module",
  "bin": { "create-app": "./dist/index.js" },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests",
    "lint": "eslint src"
  },
  "dependencies": {
    "@sublime-ui/devkit": "^0.1.0"
  },
  "devDependencies": {
    "@types/node": "^22"
  }
}
```

```jsonc
// create-app/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "types": ["node"]
  },
  "include": ["src", "test"]
}
```

```ts
// create-app/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  banner: { js: '#!/usr/bin/env node' },
});
```

`create-app/LICENSE` — copy the repo-root `LICENSE` verbatim.

```md
<!-- create-app/README.md -->
# @sublime-ui/create-app

Scaffold a new [Sublime UI](https://sublime-ui.github.io/sublime-ui/) app:

```bash
npm create @sublime-ui/app@latest my-app
```

Prompts for an app name and which targets to include (web / mobile / desktop),
then writes a complete, runnable app. See the docs for the full walkthrough.

## License

MIT
```

- [ ] **Step 4: Implement the bin**

```ts
// create-app/src/index.ts
import { resolve } from 'node:path';
import { initApp, type Target } from '@sublime-ui/devkit';

const ALL: Target[] = ['web', 'mobile', 'desktop'];

export interface ParsedArgs {
  dir: string;
  name?: string;
  targets?: Target[];
  install: boolean;
  git: boolean;
  force: boolean;
  yes: boolean;
}

export function parseArgv(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  let targets: Target[] | undefined;
  let name: string | undefined;
  let install = true;
  let git = true;
  let force = false;
  let yes = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--no-install') install = false;
    else if (a === '--no-git') git = false;
    else if (a === '--force') force = true;
    else if (a === '--yes' || a === '-y') yes = true;
    else if (a === '--name') name = argv[++i];
    else if (a === '--targets') {
      targets = (argv[++i] ?? '')
        .split(',').map((s) => s.trim())
        .filter((s): s is Target => (ALL as string[]).includes(s));
    } else if (a && !a.startsWith('-')) positionals.push(a);
  }

  const first = positionals[0] ?? '.';
  return {
    dir: resolve(process.cwd(), first),
    ...(name !== undefined ? { name } : first !== '.' ? { name: first } : {}),
    ...(targets !== undefined ? { targets } : {}),
    install, git, force, yes,
  };
}

async function main(): Promise<void> {
  const args = parseArgv(process.argv.slice(2));
  const code = await initApp(args);
  process.exit(code);
}

// Run only as a bin, not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
```

- [ ] **Step 5: Register the workspace + fixed group**

In root `package.json`, add `"create-app"` to `workspaces`. In `.changeset/config.json`, add `"@sublime-ui/create-app"` to the existing `fixed` group array.

- [ ] **Step 6: Install, build devkit, test**

```bash
ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm install --legacy-peer-deps
npm run build -w @sublime-ui/devkit
npm test -w @sublime-ui/create-app
npm run typecheck -w @sublime-ui/create-app
```

Expected: install OK; devkit builds; create-app tests PASS; typecheck clean.

- [ ] **Step 7: Commit**

```bash
git add create-app package.json package-lock.json .changeset/config.json
git commit -m "feat(create-app): @sublime-ui/create-app starter bin"
```

> **Note for implementer:** `@sublime-ui/devkit` is a workspace, so `npm install` symlinks it — `create-app` imports `initApp` from the local build. Run `npm run build -w @sublime-ui/devkit` before create-app tests so `dist/index.js` (with the new `initApp` export) exists.

---

### Task 11: End-to-end test against the real published packages

**Files:**
- Create: `devkit/test/e2e/create-app.e2e.test.ts`
- Modify: `devkit/package.json` (add a `test:e2e` script; keep e2e out of the default `test`)

**Interfaces:**
- Consumes: `initApp` (in-process) + real `npm`/`npx` against the registry.

- [ ] **Step 1: Write the e2e test (opt-in, network + slow)**

```ts
// devkit/test/e2e/create-app.e2e.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execa } from 'execa';
import { initApp } from '../../src/lib/scaffold/init.js';

let dir = '';
beforeAll(() => { dir = mkdtempSync(join(tmpdir(), 'sublime-e2e-')); });
afterAll(() => { rmSync(dir, { recursive: true, force: true }); });

describe('create-app e2e (all three targets, real registry)', () => {
  it('scaffolds, installs, compiles nav, and typechecks', async () => {
    const app = join(dir, 'demo');
    const run = async (cmd: string, args: string[], cwd: string) =>
      (await execa(cmd, args, { cwd, reject: false, env: { ...process.env, ELECTRON_SKIP_BINARY_DOWNLOAD: '1' } })).exitCode ?? 1;

    const code = await initApp({
      dir: app, name: 'demo', targets: ['web', 'mobile', 'desktop'],
      install: true, git: false, yes: true, runner: run,
    });
    expect(code).toBe(0);
    expect(existsSync(join(app, 'node_modules/@sublime-ui/framework'))).toBe(true);
    expect(existsSync(join(app, 'src/navigation/navigation.web.tsx'))).toBe(true);

    const tc = await execa('npx', ['tsc', '--noEmit'], { cwd: app, reject: false });
    expect(tc.exitCode, tc.stdout + tc.stderr).toBe(0);
  }, 600_000);
});
```

- [ ] **Step 2: Add the opt-in script**

In `devkit/package.json` scripts, add:

```json
"test:e2e": "vitest run test/e2e"
```

And exclude `test/e2e` from the default run by adding to `devkit/vitest.config.ts` `test.exclude` (keep existing excludes): `'**/test/e2e/**'`.

- [ ] **Step 3: Run the e2e once locally**

Run: `npm run build -w @sublime-ui/devkit && npm run test:e2e -w @sublime-ui/devkit`
Expected: PASS — the scaffolded all-three app installs from the registry, `build:nav` emits `navigation.web.tsx`, and `tsc --noEmit` is clean.

**If the typecheck fails**, the failure names the exact API mismatch (e.g. `rxFind`, `params`, `SublimeTokens`, a page option). Fix the corresponding template renderer (Tasks 3–6), rebuild devkit, re-run. This is the gate that proves the templates and the published packages agree. Iterate until green.

- [ ] **Step 4: Commit**

```bash
git add devkit/test/e2e/create-app.e2e.test.ts devkit/package.json devkit/vitest.config.ts
git commit -m "test(devkit): e2e scaffold + install + typecheck against the registry"
```

> **Note for implementer:** the e2e is excluded from the default `test` so CI/quick runs stay offline and fast; it is the deliberate, opt-in proof. Do NOT add it to the default gate.

---

### Task 12: Docs — step-by-step starter tutorial + changeset

**Files:**
- Create: `website/docs/getting-started/scaffold-a-new-app.md` (the step-by-step tutorial)
- Modify: `website/docs/getting-started/installation.md` (lead with `npm create`, link the tutorial)
- Create: `.changeset/starter-template.md`

**What to build:** a dedicated, numbered tutorial page that walks a brand-new user from `npm create` to a running app on each chosen target, explaining what each generated piece is. It must read as a tutorial (numbered steps, copy-paste commands, expected output, "what just happened" callouts) — not a reference dump. Place it as `sidebar_position: 1` within getting-started (before installation) so it's the first thing a newcomer sees.

- [ ] **Step 1: Write the tutorial page**

````md
<!-- website/docs/getting-started/scaffold-a-new-app.md -->
---
sidebar_position: 1
title: Scaffold a New App
---

# Scaffold a New App

This is the fastest way to go from nothing to a running, cross-platform Sublime
app. The generator writes a complete project — shared models and theme,
per-platform screens, compiled navigation — and installs everything for you.

## Prerequisites

- **Node.js 18+** and npm.
- For the **mobile** target you'll also need the Android toolchain later
  (`sublime doctor` checks it) — but you can scaffold and run web/desktop without
  it.

## Step 1 — Run the generator

```bash
npm create @sublime-ui/app@latest my-app
```

`npm create @sublime-ui/app` downloads and runs `@sublime-ui/create-app`. The
`my-app` argument is the folder (and default app name) to create.

> Already have the CLI installed? `sublime init my-app` does exactly the same
> thing — both share one engine.

## Step 2 — Answer the prompts

```text
? App name: my-app
? Targets: (space to toggle, enter to accept)
 ◉ web (Vite + MUI)
 ◉ mobile (React Native + Paper)
 ◉ desktop (Electron, wraps web)
```

All three targets are pre-checked — press **Enter** to get the full
write-once-run-everywhere app, or toggle off the ones you don't need. (Desktop
renders the web UI, so it always comes with web.)

## Step 3 — Let it install

The generator writes the files, runs `git init`, then `npm install` and
`sublime build:nav` (which compiles your navigation). When it finishes you'll
see your next steps:

```text
✓ Scaffolded my-app (web, mobile, desktop)
Next:  cd my-app
       npm run dev:web
```

## What just got generated

```text
my-app/
  src/
    models/Task.ts          # a sample model (reactive, cache-first data)
    theme/tokens.ts         # design tokens shared across platforms
    screens/web/            # web screens (TaskList → TaskDetail)
    screens/mobile/         # mobile screens (.native.tsx)
    navigation/             # storybook.web.ts + storybook.native.ts
    native/greeter.service.ts   # a sample desktop native service
  web/                      # web entry (Vite)
  mobile/                   # React Native entry
  desktop/                  # Electron Forge shell
  sublime.config.json
```

Every piece is a **working example of one subsystem** — a model, a theme, a
screen per platform, typed navigation, and (on desktop) a native bridge call.
Read them, then replace them with your own.

## Step 4 — Run the web app

```bash
cd my-app
npm run dev:web
```

Open the printed URL. You'll see the **Tasks** screen (from
`src/screens/web/TaskList.tsx`); clicking a task navigates to the typed
**Task** detail screen via `nav.turnTo('task', { id })`.

## Step 5 — Run the desktop app

```bash
npm run desktop:dev
```

This launches the Electron shell, which renders the **same web UI** and adds the
native bridge. The sample `greeter` service runs in the main process and is
called from the renderer with `useNative('greeter')`.

## Step 6 — Run the mobile app

```bash
sublime doctor        # check the Android toolchain (one-time)
npm run dev:mobile    # build + run on a device/emulator
```

Mobile uses your `src/screens/mobile/*.native.tsx` screens and
`storybook.native.ts` (a `bottomNav` layout). See
[Running your app](./running) for device setup.

## Step 7 — Make it yours

- **Add a model:** `sublime make:model Post --fields "title:string"`
- **Add a component:** `sublime make:component Card`
- **Edit navigation:** change `src/navigation/storybook.web.ts` /
  `storybook.native.ts`, then re-run `npm run build:nav`.

When you change navigation, always re-run `build:nav` to regenerate the typed
routes.

## Next steps

- [Your First App](./your-first-app) — build the same app by hand to understand
  each layer.
- [The Learning Path](../learning-path) — basics to advanced.
````

- [ ] **Step 2: Reorder getting-started + update the installation doc**

The new tutorial is `sidebar_position: 1`. Bump the existing pages so it leads
(current: installation=1, your-first-app=2, running=3):
- `website/docs/getting-started/installation.md` → `sidebar_position: 2`
- `website/docs/getting-started/your-first-app.md` → `sidebar_position: 3`
- `website/docs/getting-started/running.md` → `sidebar_position: 4`

Then add, near the top of `installation.md`, a short pointer:

````md
## Scaffold a new app (recommended)

The fastest start is the generator — it writes a complete app and installs
everything:

```bash
npm create @sublime-ui/app@latest my-app
```

See **[Scaffold a New App](./scaffold-a-new-app)** for the full step-by-step
walkthrough. The rest of this page covers installing Sublime into an existing
project by hand.
````

- [ ] **Step 3: Verify the docs build**

Run: `cd website && npm run build`
Expected: `[SUCCESS]` — no broken-link or MDX errors. (Fix any relative-link or fenced-code issues the build reports.)

- [ ] **Step 4: Add a changeset (drives the next release)**

```md
<!-- .changeset/starter-template.md -->
---
"@sublime-ui/devkit": minor
"@sublime-ui/create-app": minor
---

Add the starter-app generator: `npm create @sublime-ui/app` (new
`@sublime-ui/create-app` package) and `sublime init`, which scaffold a complete
web/mobile/desktop Sublime app from a minimal vertical slice.
```

(Because the packages are a fixed group, this bumps all `@sublime-ui/*` together on the next `changeset version`.)

- [ ] **Step 5: Commit**

```bash
git add website/docs/getting-started/scaffold-a-new-app.md website/docs/getting-started/installation.md .changeset/starter-template.md
git commit -m "docs: step-by-step starter tutorial + npm create @sublime-ui/app"
```

---

## Final Verification (before requesting review / merge)

- [ ] `npm run typecheck --workspaces --if-present` — clean (incl. new `create-app`).
- [ ] `npm test --workspaces --if-present` — green (default run; e2e excluded).
- [ ] `npm run build --workspaces --if-present` — clean (devkit + create-app emit `dist`).
- [ ] `npm run lint` — clean (`eslint . --max-warnings=0`).
- [ ] `npm run build -w @sublime-ui/devkit && npm run test:e2e -w @sublime-ui/devkit` — the real-registry scaffold typechecks green (the headline proof).
- [ ] `npm pack --dry-run -w @sublime-ui/create-app` — ships `dist` + `LICENSE` + `README` + the `create-app` bin.

## Self-Review Notes (spec coverage)

- Delivery (`@sublime-ui/create-app` + `sublime init`, shared `initApp`) — Tasks 8–10. ✓
- Interactive target selection, pre-checked, with non-interactive flags — Tasks 8 (`prompt`/`--yes`), 9 (`checkbox`), 10 (argv). ✓
- Minimal vertical slice (Task model, theme, List→Detail per platform, 2-page storybook, greeter native service) — Tasks 3–7. ✓
- Desktop reuses `@sublime-ui/desktop` templates + renders web UI — Task 6, plan reuses web files. ✓
- Pins published `@sublime-ui/*` ranges from one constant — Task 1. ✓
- Post-scaffold install + `build:nav`; refuse non-empty dir; npm-name validation — Task 8. ✓
- E2E against the real registry (now possible post-publish) — Task 11. ✓
- Publish-readiness for `create-app` (scoped, public, fixed group, bin) — Task 10. ✓
