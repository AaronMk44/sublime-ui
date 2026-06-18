# Sublime UI — Library Design System (#4) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The component tasks (9–29) are a **fan-out**: each is independent and follows the **Component Recipe** established by Task 8.

**Goal:** Build `@sublime-ui/library` — a tokens-first, cross-platform design system: one serializable token config generates both a Paper (mobile) and an MUI (web) theme; a platform-resolved provider installs them; a unified `useNotify` notification system; and 21 glass-styled components behind a single import.

**Architecture:** A canonical `SublimeTokens` object is the source of truth. A pure `generateThemes(tokens, mode)` maps it to `{ paperTheme, muiTheme }`. `SublimeProvider` is platform-resolved (`.tsx` web / `.native.tsx` mobile) and mounts the theme + token context + notification host. Each component ships `X.types.ts` (shared props) + `X.tsx` (MUI) + `X.native.tsx` (Paper); the consumer's bundler (Metro/Vite) picks the file. The build preserves the `.native`/web split.

**Tech Stack:** TypeScript (strict, ESM), React 18 (peer), React Native + react-native-paper (mobile), MUI + @emotion (web), the native fetch-free presentation layer; tsup/tsc (build, per-file output), vitest + @testing-library/react + jsdom (test), react-test-renderer (native mount checks).

## Global Constraints

- **Strict TS** (inherited from `tsconfig.base.json`): `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes`, `noUnusedLocals`, `noUnusedParameters`. ESM only.
- **Package:** `@sublime-ui/library`, `version 0.0.0`, `"type": "module"`. No bin.
- **Tokens-first:** `SublimeTokens` is a plain, JSON-serializable object (no functions inside). `generateThemes(tokens, mode)` is **pure** (the future devkit-server customizer seam).
- **Platform resolution:** every component = `X.types.ts` + `X.tsx` (web/MUI) + `X.native.tsx` (mobile/Paper) + `index.ts`. Both impls import props from `X.types.ts` → identical API. `BottomNav`/`Drawer` are mobile-only: real `.native.tsx`, web `.tsx` is a null+dev-warn stub.
- **Build preserves the `.native`/web split** for consumer bundlers (per-file emit; `react-native` package.json field).
- **Glass aesthetic** default, derived from tokens. Common props where meaningful: `variant` (`solid|soft|outline|ghost`), `tone` (`primary|success|danger|warning|info|neutral`), `size` (`sm|md|lg`).
- **Library is independent of framework #2** — the notification queue is self-contained React state, NOT Redux.
- **No icon set bundled** — `Icon` wraps a slot/name prop.
- **Commits:** conventional-commit messages, NO Claude/AI attribution.
- **Spec:** `docs/superpowers/specs/2026-06-18-sublime-ui-library-design-system-design.md`.

---

## File Structure

```
library/
  package.json            # deps/peers/devDeps, build config (Task 1)
  tsconfig.json           # DOM lib + jsx + include test (Task 1)
  tsup.config.ts          # per-file ESM emit preserving platform files (Task 1)
  vitest.config.ts        # jsdom env (Task 1)
  src/
    tokens/
      tokens.ts             # SublimeTokens type + defaultTokens (Task 2)
      generateThemes.ts     # pure tokens -> { paperTheme, muiTheme } (Task 3)
    provider/
      TokenContext.ts       # context (Task 4)
      useTokens.ts          # hook (Task 4)
      SublimeProvider.tsx / .native.tsx   # (Task 5)
    notifications/
      NotificationContext.tsx # queue + provider (JSX) (Task 6)
      useNotify.ts            # hook (Task 6)
      NotificationHost.tsx / .native.tsx   # (Task 7)
    components/
      Button/  Button.types.ts  Button.tsx  Button.native.tsx  index.ts   # recipe (Task 8)
      <Component>/ ...          # Tasks 9–29 (fan-out)
    test-utils/renderWeb.tsx    # MUI+token render helper (Task 1)
    index.ts                    # public exports (Task 30)
  test/
```

---

## Task 1: Package setup — deps, platform build, jsdom test env

**Files:**
- Modify: `library/package.json`, `library/tsconfig.json`
- Create: `library/tsup.config.ts`, `library/vitest.config.ts`, `library/src/test-utils/renderWeb.tsx`, `library/test/setup.smoke.test.tsx`

**Interfaces:**
- Produces: an installable library workspace with Paper + MUI + React peers, a jsdom test env, and a build that preserves `.native`/web files.

- [ ] **Step 1: `library/package.json`**

```json
{
  "name": "@sublime-ui/library",
  "version": "0.0.0",
  "type": "module",
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  "react-native": "./src/index.ts",
  "files": ["dist", "src"],
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests",
    "lint": "eslint src"
  },
  "peerDependencies": {
    "react": ">=18",
    "react-native": ">=0.74",
    "react-native-paper": ">=5",
    "@mui/material": ">=6",
    "@emotion/react": ">=11",
    "@emotion/styled": ">=11"
  },
  "peerDependenciesMeta": {
    "react-native": { "optional": true },
    "react-native-paper": { "optional": true },
    "@mui/material": { "optional": true },
    "@emotion/react": { "optional": true },
    "@emotion/styled": { "optional": true }
  },
  "devDependencies": {
    "@emotion/react": "^11.13.3",
    "@emotion/styled": "^11.13.0",
    "@mui/material": "^6.1.6",
    "@testing-library/react": "^16.0.1",
    "@types/node": "^22",
    "@types/react": "^18.3.12",
    "jsdom": "^25.0.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-native": "^0.76.1",
    "react-native-paper": "^5.12.5",
    "react-test-renderer": "^18.3.1"
  }
}
```

> Note on `react-native` field: it points Metro at `src` so platform files resolve from source; web consumers use the built `dist`. The `src` dir is published (in `files`) for RN. The build emits `dist` for web.

- [ ] **Step 2: `library/tsconfig.json`** (DOM lib + React JSX + include test; drop rootDir)

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": ["node"],
    "skipLibCheck": true
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 3: `library/tsup.config.ts`** (per-file emit so platform files survive for consumers)

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**/*.ts', 'src/**/*.tsx', '!src/**/*.native.tsx', '!src/test-utils/**'],
  format: ['esm'],
  dts: true,
  clean: true,
  bundle: false,
  external: ['react', 'react-native', 'react-native-paper', '@mui/material', '@emotion/react', '@emotion/styled'],
});
```

> `bundle: false` preserves the file tree (web `.tsx` → `dist/.js`). `.native.tsx` files are excluded from the web build and shipped via `src` for Metro.

- [ ] **Step 4: `library/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'jsdom', globals: false, include: ['test/**/*.test.{ts,tsx}'] },
});
```

- [ ] **Step 5: `library/src/test-utils/renderWeb.tsx`** (render a web component under MUI theme + token + notification providers)

```tsx
import { createElement, type ReactElement } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { SublimeProvider } from '../provider/SublimeProvider.js';

/** Renders a web component tree inside SublimeProvider (light mode). */
export function renderWeb(ui: ReactElement): RenderResult {
  return render(createElement(SublimeProvider, { mode: 'light', children: ui }));
}
```

> Note: `renderWeb` imports `SublimeProvider` (Task 5). It is used only by component tests (Task 8+), so it compiles once Task 5 lands.

- [ ] **Step 6: `library/test/setup.smoke.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { createTheme } from '@mui/material';

describe('library test environment', () => {
  it('has jsdom', () => {
    expect(document.createElement('div').tagName).toBe('DIV');
  });
  it('can build an MUI theme', () => {
    const t = createTheme({ palette: { primary: { main: '#3b82f6' } } });
    expect(t.palette.primary.main).toBe('#3b82f6');
  });
});
```

- [ ] **Step 7: Install + verify**

```bash
npm install
npm run test -w @sublime-ui/library
npm run typecheck -w @sublime-ui/library
npm run lint -w @sublime-ui/library
```
Expected: install adds peers/devDeps; the 2 smoke tests pass; typecheck + lint exit 0. (Build is verified once real source exists.)

- [ ] **Step 8: Commit**

```bash
git add library/package.json library/tsconfig.json library/tsup.config.ts library/vitest.config.ts library/src/test-utils/renderWeb.tsx library/test/setup.smoke.test.tsx package-lock.json
git commit -m "chore(library): add Paper/MUI deps, platform build, jsdom test env"
```

---

## Task 2: `tokens` — `SublimeTokens` + `defaultTokens`

**Files:**
- Create: `library/src/tokens/tokens.ts`
- Test: `library/test/tokens.test.ts`

**Interfaces:**
- Produces: `interface ColorTokens`, `interface SublimeTokens`, `const defaultTokens: SublimeTokens` (serializable; light + dark).

- [ ] **Step 1: Write the failing test**

`library/test/tokens.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { defaultTokens, type ColorTokens } from '../src/tokens/tokens.js';

const colorKeys: (keyof ColorTokens)[] = [
  'primary', 'primaryFg', 'secondary', 'secondaryFg',
  'success', 'warning', 'danger', 'info',
  'background', 'foreground', 'mutedFg',
  'surface', 'surfaceBorder', 'surfaceHover', 'glassBg', 'glassBorder', 'divider', 'ring',
  'primarySoftBg', 'primarySoftFg', 'successSoftBg', 'successSoftFg',
  'warningSoftBg', 'warningSoftFg', 'dangerSoftBg', 'dangerSoftFg', 'infoSoftBg', 'infoSoftFg',
];

describe('defaultTokens', () => {
  it('defines complete light and dark color sets', () => {
    for (const mode of ['light', 'dark'] as const) {
      for (const key of colorKeys) {
        expect(typeof defaultTokens.color[mode][key], `${mode}.${key}`).toBe('string');
      }
    }
  });
  it('has radii, shadows, spacing, typography scales', () => {
    expect(defaultTokens.radii.md).toBeTypeOf('number');
    expect(defaultTokens.shadows.sm).toBeTypeOf('string');
    expect(defaultTokens.spacing.md).toBeTypeOf('number');
    expect(defaultTokens.typography.sizes.md).toBeTypeOf('number');
    expect(defaultTokens.typography.weights.semibold).toBeTypeOf('number');
  });
  it('is JSON-serializable (no functions)', () => {
    expect(() => JSON.stringify(defaultTokens)).not.toThrow();
    expect(JSON.parse(JSON.stringify(defaultTokens)).color.light.primary).toBe(
      defaultTokens.color.light.primary,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @sublime-ui/library`
Expected: FAIL — cannot resolve `../src/tokens/tokens.js`.

- [ ] **Step 3: Write the implementation** (values adapted from the Gulani glass tokens)

`library/src/tokens/tokens.ts`:
```ts
export interface ColorTokens {
  primary: string; primaryFg: string;
  secondary: string; secondaryFg: string;
  success: string; warning: string; danger: string; info: string;
  background: string; foreground: string; mutedFg: string;
  surface: string; surfaceBorder: string; surfaceHover: string;
  glassBg: string; glassBorder: string; divider: string; ring: string;
  primarySoftBg: string; primarySoftFg: string;
  successSoftBg: string; successSoftFg: string;
  warningSoftBg: string; warningSoftFg: string;
  dangerSoftBg: string; dangerSoftFg: string;
  infoSoftBg: string; infoSoftFg: string;
}

export interface SublimeTokens {
  color: { light: ColorTokens; dark: ColorTokens };
  radii: { sm: number; md: number; lg: number; full: number };
  shadows: { sm: string; md: string; lg: string };
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number };
  typography: {
    family: string;
    sizes: { xs: number; sm: number; md: number; lg: number; xl: number; '2xl': number };
    weights: { regular: number; medium: number; semibold: number; bold: number };
  };
}

const light: ColorTokens = {
  primary: 'rgb(37,99,235)', primaryFg: 'rgb(255,255,255)',
  secondary: 'rgb(100,116,139)', secondaryFg: 'rgb(255,255,255)',
  success: 'rgb(22,163,74)', warning: 'rgb(217,119,6)', danger: 'rgb(220,38,38)', info: 'rgb(2,132,199)',
  background: 'rgb(247,250,255)', foreground: 'rgb(15,23,42)', mutedFg: 'rgba(71,85,105,0.85)',
  surface: 'rgba(243,248,255,0.90)', surfaceBorder: 'rgba(15,23,42,0.08)', surfaceHover: 'rgba(59,130,246,0.06)',
  glassBg: 'rgba(236,244,255,0.60)', glassBorder: 'rgba(15,23,42,0.08)', divider: 'rgba(15,23,42,0.06)',
  ring: 'rgba(59,130,246,0.45)',
  primarySoftBg: 'rgba(59,130,246,0.08)', primarySoftFg: 'rgb(29,78,216)',
  successSoftBg: 'rgba(34,197,94,0.10)', successSoftFg: 'rgb(21,128,61)',
  warningSoftBg: 'rgba(245,158,11,0.12)', warningSoftFg: 'rgb(180,83,9)',
  dangerSoftBg: 'rgba(244,63,94,0.08)', dangerSoftFg: 'rgb(190,18,60)',
  infoSoftBg: 'rgba(14,165,233,0.10)', infoSoftFg: 'rgb(3,105,161)',
};

const dark: ColorTokens = {
  primary: 'rgb(96,165,250)', primaryFg: 'rgb(8,12,20)',
  secondary: 'rgb(148,163,184)', secondaryFg: 'rgb(8,12,20)',
  success: 'rgb(74,222,128)', warning: 'rgb(251,191,36)', danger: 'rgb(251,113,133)', info: 'rgb(56,189,248)',
  background: 'rgb(8,12,20)', foreground: 'rgb(245,247,251)', mutedFg: 'rgba(229,231,235,0.65)',
  surface: 'rgba(96,165,250,0.06)', surfaceBorder: 'rgba(255,255,255,0.08)', surfaceHover: 'rgba(255,255,255,0.06)',
  glassBg: 'rgba(96,165,250,0.05)', glassBorder: 'rgba(255,255,255,0.08)', divider: 'rgba(255,255,255,0.06)',
  ring: 'rgba(96,165,250,0.55)',
  primarySoftBg: 'rgba(59,130,246,0.12)', primarySoftFg: 'rgb(147,197,253)',
  successSoftBg: 'rgba(34,197,94,0.16)', successSoftFg: 'rgb(134,239,172)',
  warningSoftBg: 'rgba(245,158,11,0.18)', warningSoftFg: 'rgb(253,224,71)',
  dangerSoftBg: 'rgba(244,63,94,0.18)', dangerSoftFg: 'rgb(253,164,175)',
  infoSoftBg: 'rgba(14,165,233,0.16)', infoSoftFg: 'rgb(125,211,252)',
};

export const defaultTokens: SublimeTokens = {
  color: { light, dark },
  radii: { sm: 8, md: 12, lg: 16, full: 999 },
  shadows: {
    sm: '0 1px 2px rgba(15,23,42,0.06)',
    md: '0 4px 12px rgba(15,23,42,0.10)',
    lg: '0 12px 32px rgba(15,23,42,0.16)',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  typography: {
    family: 'Inter, system-ui, sans-serif',
    sizes: { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, '2xl': 28 },
    weights: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w @sublime-ui/library`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add library/src/tokens/tokens.ts library/test/tokens.test.ts
git commit -m "feat(library): add SublimeTokens contract and defaultTokens"
```

---

## Task 3: `generateThemes` — tokens → Paper + MUI themes (pure)

**Files:**
- Create: `library/src/tokens/generateThemes.ts`
- Test: `library/test/generateThemes.test.ts`

**Interfaces:**
- Consumes: `SublimeTokens` (Task 2), `react-native-paper` (`MD3LightTheme`/`MD3DarkTheme`/`MD3Theme`), `@mui/material` (`createTheme`/`Theme`).
- Produces: `generateThemes(tokens: SublimeTokens, mode: 'light' | 'dark'): { paperTheme: MD3Theme; muiTheme: Theme }` — pure.

- [ ] **Step 1: Write the failing test**

`library/test/generateThemes.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { generateThemes } from '../src/tokens/generateThemes.js';
import { defaultTokens } from '../src/tokens/tokens.js';

describe('generateThemes', () => {
  it('maps tokens into a Paper MD3 theme', () => {
    const { paperTheme } = generateThemes(defaultTokens, 'light');
    expect(paperTheme.colors.primary).toBe(defaultTokens.color.light.primary);
    expect(paperTheme.colors.error).toBe(defaultTokens.color.light.danger);
    expect(paperTheme.roundness).toBe(defaultTokens.radii.md);
    expect(paperTheme.dark).toBe(false);
  });
  it('maps tokens into an MUI theme', () => {
    const { muiTheme } = generateThemes(defaultTokens, 'dark');
    expect(muiTheme.palette.mode).toBe('dark');
    expect(muiTheme.palette.primary.main).toBe(defaultTokens.color.dark.primary);
    expect(muiTheme.palette.error.main).toBe(defaultTokens.color.dark.danger);
    expect(muiTheme.shape.borderRadius).toBe(defaultTokens.radii.md);
  });
  it('is pure — same input yields equal output shape', () => {
    const a = generateThemes(defaultTokens, 'light');
    const b = generateThemes(defaultTokens, 'light');
    expect(a.muiTheme.palette.primary.main).toBe(b.muiTheme.palette.primary.main);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @sublime-ui/library`
Expected: FAIL — cannot resolve `../src/tokens/generateThemes.js`.

- [ ] **Step 3: Write the implementation**

`library/src/tokens/generateThemes.ts`:
```ts
import { MD3LightTheme, MD3DarkTheme, type MD3Theme } from 'react-native-paper';
import { createTheme, type Theme } from '@mui/material';
import type { SublimeTokens } from './tokens.js';

export function generateThemes(
  tokens: SublimeTokens,
  mode: 'light' | 'dark',
): { paperTheme: MD3Theme; muiTheme: Theme } {
  const c = tokens.color[mode];
  const base = mode === 'dark' ? MD3DarkTheme : MD3LightTheme;

  const paperTheme: MD3Theme = {
    ...base,
    roundness: tokens.radii.md,
    colors: {
      ...base.colors,
      primary: c.primary,
      onPrimary: c.primaryFg,
      secondary: c.secondary,
      onSecondary: c.secondaryFg,
      error: c.danger,
      background: c.background,
      onBackground: c.foreground,
      surface: c.surface,
      onSurface: c.foreground,
      outline: c.surfaceBorder,
      outlineVariant: c.divider,
    },
  };

  const muiTheme = createTheme({
    palette: {
      mode,
      primary: { main: c.primary, contrastText: c.primaryFg },
      secondary: { main: c.secondary, contrastText: c.secondaryFg },
      success: { main: c.success },
      warning: { main: c.warning },
      error: { main: c.danger },
      info: { main: c.info },
      background: { default: c.background, paper: c.surface },
      text: { primary: c.foreground, secondary: c.mutedFg },
      divider: c.divider,
    },
    shape: { borderRadius: tokens.radii.md },
    typography: { fontFamily: tokens.typography.family },
  });

  return { paperTheme, muiTheme };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w @sublime-ui/library`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add library/src/tokens/generateThemes.ts library/test/generateThemes.test.ts
git commit -m "feat(library): add pure generateThemes (tokens -> Paper + MUI)"
```

---

## Task 4: `TokenContext` + `useTokens`

**Files:**
- Create: `library/src/provider/TokenContext.ts`, `library/src/provider/useTokens.ts`
- Test: `library/test/useTokens.test.tsx`

**Interfaces:**
- Consumes: `ColorTokens`/`SublimeTokens` (Task 2).
- Produces:
  - `interface ResolvedTokens { color: ColorTokens; radii; shadows; spacing; typography; mode: 'light'|'dark' }` (the active-mode tokens).
  - `TokenContext` (React context of `ResolvedTokens | null`).
  - `useTokens(): ResolvedTokens` — throws if used outside `SublimeProvider`.

- [ ] **Step 1: Write the failing test**

`library/test/useTokens.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderHook } from '@testing-library/react';
import { TokenContext } from '../src/provider/TokenContext.js';
import { useTokens } from '../src/provider/useTokens.js';
import { defaultTokens } from '../src/tokens/tokens.js';

const resolved = {
  color: defaultTokens.color.light, radii: defaultTokens.radii, shadows: defaultTokens.shadows,
  spacing: defaultTokens.spacing, typography: defaultTokens.typography, mode: 'light' as const,
};

describe('useTokens', () => {
  it('returns the active resolved tokens from context', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(TokenContext.Provider, { value: resolved, children });
    const { result } = renderHook(() => useTokens(), { wrapper });
    expect(result.current.color.primary).toBe(defaultTokens.color.light.primary);
    expect(result.current.mode).toBe('light');
  });
  it('throws when used without a provider', () => {
    expect(() => renderHook(() => useTokens())).toThrow(/SublimeProvider/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -w @sublime-ui/library`
Expected: FAIL — cannot resolve the new modules.

- [ ] **Step 3: Write `TokenContext.ts`**

```ts
import { createContext } from 'react';
import type { ColorTokens, SublimeTokens } from '../tokens/tokens.js';

export interface ResolvedTokens {
  color: ColorTokens;
  radii: SublimeTokens['radii'];
  shadows: SublimeTokens['shadows'];
  spacing: SublimeTokens['spacing'];
  typography: SublimeTokens['typography'];
  mode: 'light' | 'dark';
}

export const TokenContext = createContext<ResolvedTokens | null>(null);
```

- [ ] **Step 4: Write `useTokens.ts`**

```ts
import { useContext } from 'react';
import { TokenContext, type ResolvedTokens } from './TokenContext.js';

export function useTokens(): ResolvedTokens {
  const tokens = useContext(TokenContext);
  if (tokens === null) {
    throw new Error('useTokens must be used within a <SublimeProvider>.');
  }
  return tokens;
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm run test -w @sublime-ui/library`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add library/src/provider/TokenContext.ts library/src/provider/useTokens.ts library/test/useTokens.test.tsx
git commit -m "feat(library): add TokenContext + useTokens"
```

---

## Task 5: `SublimeProvider` (web + native)

**Files:**
- Create: `library/src/provider/SublimeProvider.tsx` (web), `library/src/provider/SublimeProvider.native.tsx` (mobile), `library/src/provider/resolveTokens.ts`
- Test: `library/test/SublimeProvider.test.tsx`

**Interfaces:**
- Consumes: `generateThemes` (Task 3), `TokenContext`/`ResolvedTokens` (Task 4), `defaultTokens` (Task 2), `NotificationProvider`/`NotificationHost` (Tasks 6–7).
- Produces:
  - `interface SublimeProviderProps { mode?: 'light' | 'dark'; tokens?: SublimeTokens; children: ReactNode }`
  - `resolveTokens(tokens, mode): ResolvedTokens` (pure helper).
  - `SublimeProvider` — web wraps MUI `ThemeProvider` + `CssBaseline` + `TokenContext` + `NotificationProvider` + web `NotificationHost`; native wraps Paper `Provider` + the same contexts + native host.

> Note: this task references `NotificationProvider`/`NotificationHost` (Tasks 6–7). Land Tasks 6–7 **before** Task 5, OR stub the host import. Recommended order: 1→2→3→4→**6→7**→5→8→… (the controller dispatches 6,7 before 5).

- [ ] **Step 1: Write the failing test (web)**

`library/test/SublimeProvider.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { SublimeProvider } from '../src/provider/SublimeProvider.js';
import { useTokens } from '../src/provider/useTokens.js';

function Probe() {
  const t = useTokens();
  return createElement('span', { 'data-testid': 'mode' }, t.mode);
}

describe('SublimeProvider (web)', () => {
  it('supplies resolved tokens for the active mode', () => {
    render(createElement(SublimeProvider, { mode: 'dark', children: createElement(Probe) }));
    expect(screen.getByTestId('mode').textContent).toBe('dark');
  });
  it('defaults to light mode', () => {
    render(createElement(SublimeProvider, { children: createElement(Probe) }));
    expect(screen.getByTestId('mode').textContent).toBe('light');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -w @sublime-ui/library`
Expected: FAIL — cannot resolve `SublimeProvider.js`.

- [ ] **Step 3: Write `resolveTokens.ts`**

```ts
import type { SublimeTokens } from '../tokens/tokens.js';
import type { ResolvedTokens } from './TokenContext.js';

export function resolveTokens(
  tokens: SublimeTokens,
  mode: 'light' | 'dark',
): ResolvedTokens {
  return {
    color: tokens.color[mode],
    radii: tokens.radii,
    shadows: tokens.shadows,
    spacing: tokens.spacing,
    typography: tokens.typography,
    mode,
  };
}
```

- [ ] **Step 4: Write `SublimeProvider.tsx` (web)**

```tsx
import { type ReactNode, useMemo } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { generateThemes } from '../tokens/generateThemes.js';
import { defaultTokens, type SublimeTokens } from '../tokens/tokens.js';
import { TokenContext } from './TokenContext.js';
import { resolveTokens } from './resolveTokens.js';
import { NotificationProvider } from '../notifications/NotificationContext.js';
import { NotificationHost } from '../notifications/NotificationHost.js';

export interface SublimeProviderProps {
  mode?: 'light' | 'dark';
  tokens?: SublimeTokens;
  children: ReactNode;
}

export function SublimeProvider({ mode = 'light', tokens = defaultTokens, children }: SublimeProviderProps) {
  const { muiTheme } = useMemo(() => generateThemes(tokens, mode), [tokens, mode]);
  const resolved = useMemo(() => resolveTokens(tokens, mode), [tokens, mode]);
  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <TokenContext.Provider value={resolved}>
        <NotificationProvider>
          {children}
          <NotificationHost />
        </NotificationProvider>
      </TokenContext.Provider>
    </ThemeProvider>
  );
}
```

- [ ] **Step 5: Write `SublimeProvider.native.tsx` (mobile)**

```tsx
import { type ReactNode, useMemo } from 'react';
import { PaperProvider } from 'react-native-paper';
import { generateThemes } from '../tokens/generateThemes.js';
import { defaultTokens, type SublimeTokens } from '../tokens/tokens.js';
import { TokenContext } from './TokenContext.js';
import { resolveTokens } from './resolveTokens.js';
import { NotificationProvider } from '../notifications/NotificationContext.js';
import { NotificationHost } from '../notifications/NotificationHost.native.js';

export interface SublimeProviderProps {
  mode?: 'light' | 'dark';
  tokens?: SublimeTokens;
  children: ReactNode;
}

export function SublimeProvider({ mode = 'light', tokens = defaultTokens, children }: SublimeProviderProps) {
  const { paperTheme } = useMemo(() => generateThemes(tokens, mode), [tokens, mode]);
  const resolved = useMemo(() => resolveTokens(tokens, mode), [tokens, mode]);
  return (
    <PaperProvider theme={paperTheme}>
      <TokenContext.Provider value={resolved}>
        <NotificationProvider>
          {children}
          <NotificationHost />
        </NotificationProvider>
      </TokenContext.Provider>
    </PaperProvider>
  );
}
```

> `react-native-paper` exports `Provider` as `PaperProvider` in v5. The native file is excluded from the web build (Task 1 tsup config) and resolved by Metro.

- [ ] **Step 6: Run to verify it passes**

Run: `npm run test -w @sublime-ui/library`
Expected: PASS (web provider supplies tokens).

- [ ] **Step 7: Commit**

```bash
git add library/src/provider/SublimeProvider.tsx library/src/provider/SublimeProvider.native.tsx library/src/provider/resolveTokens.ts library/test/SublimeProvider.test.tsx
git commit -m "feat(library): add SublimeProvider (web + native)"
```

---

## Task 6: Notification queue + `useNotify`

**Files:**
- Create: `library/src/notifications/NotificationContext.tsx` (JSX), `library/src/notifications/useNotify.ts`
- Test: `library/test/useNotify.test.tsx`

**Interfaces:**
- Produces:
  - `type Tone = 'success' | 'error' | 'warning' | 'info' | 'neutral'`
  - `interface Notification { id: string; message: string; tone: Tone; duration: number; action?: { label: string; onPress: () => void } }`
  - `interface NotifyOptions { tone?: Tone; duration?: number; action?: { label: string; onPress: () => void } }`
  - `NotificationProvider` (component) holding the queue + a context exposing `{ queue, notify, dismiss }`.
  - `useNotificationQueue()` (internal, for the host).
  - `useNotify(): { notify; success; error; warning; info; dismiss }`.

- [ ] **Step 1: Write the failing test**

`library/test/useNotify.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { NotificationProvider, useNotificationQueue } from '../src/notifications/NotificationContext.js';
import { useNotify } from '../src/notifications/useNotify.js';

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(NotificationProvider, { children });

describe('useNotify', () => {
  it('enqueues with the right tone', () => {
    const { result } = renderHook(
      () => ({ notify: useNotify(), queue: useNotificationQueue() }),
      { wrapper },
    );
    act(() => { result.current.notify.success('Saved'); });
    expect(result.current.queue.queue).toHaveLength(1);
    expect(result.current.queue.queue[0]!.message).toBe('Saved');
    expect(result.current.queue.queue[0]!.tone).toBe('success');
  });

  it('dismiss removes by id', () => {
    const { result } = renderHook(
      () => ({ notify: useNotify(), queue: useNotificationQueue() }),
      { wrapper },
    );
    act(() => { result.current.notify.error('Boom'); });
    const id = result.current.queue.queue[0]!.id;
    act(() => { result.current.notify.dismiss(id); });
    expect(result.current.queue.queue).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -w @sublime-ui/library`
Expected: FAIL — cannot resolve the notification modules.

- [ ] **Step 3: Write `NotificationContext.tsx`** (JSX → `.tsx`)

```tsx
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

export type Tone = 'success' | 'error' | 'warning' | 'info' | 'neutral';

export interface Notification {
  id: string;
  message: string;
  tone: Tone;
  duration: number;
  action?: { label: string; onPress: () => void };
}

export interface NotifyOptions {
  tone?: Tone;
  duration?: number;
  action?: { label: string; onPress: () => void };
}

interface QueueApi {
  queue: Notification[];
  notify: (message: string, opts?: NotifyOptions) => string;
  dismiss: (id: string) => void;
}

const Ctx = createContext<QueueApi | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Notification[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setQueue((q) => q.filter((n) => n.id !== id));
  }, []);

  const notify = useCallback((message: string, opts: NotifyOptions = {}) => {
    counter.current += 1;
    const id = `n${counter.current}`;
    const n: Notification = {
      id,
      message,
      tone: opts.tone ?? 'neutral',
      duration: opts.duration ?? 4000,
      ...(opts.action ? { action: opts.action } : {}),
    };
    setQueue((q) => [...q, n]);
    return id;
  }, []);

  const value = useMemo<QueueApi>(() => ({ queue, notify, dismiss }), [queue, notify, dismiss]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotificationQueue(): QueueApi {
  const api = useContext(Ctx);
  if (api === null) throw new Error('Notifications require a <SublimeProvider>.');
  return api;
}
```

> `useCallback` is imported from `react` (alias of `useCallback`); ensure the import reads `useCallback` (correct React export). If the verbatim import has a typo, fix to the real React hook names: `useCallback`, `useContext`, `useMemo`, `useRef`, `useState`.

- [ ] **Step 4: Write `useNotify.ts`**

```ts
import { useMemo } from 'react';
import { useNotificationQueue, type NotifyOptions, type Tone } from './NotificationContext.js';

export function useNotify() {
  const { notify, dismiss } = useNotificationQueue();
  return useMemo(() => {
    const toned = (tone: Tone) => (message: string, opts?: NotifyOptions) =>
      notify(message, { ...opts, tone });
    return {
      notify,
      dismiss,
      success: toned('success'),
      error: toned('error'),
      warning: toned('warning'),
      info: toned('info'),
    };
  }, [notify, dismiss]);
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm run test -w @sublime-ui/library`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add library/src/notifications/NotificationContext.tsx library/src/notifications/useNotify.ts library/test/useNotify.test.tsx
git commit -m "feat(library): add notification queue + useNotify"
```

---

## Task 7: `NotificationHost` (web + native)

**Files:**
- Create: `library/src/notifications/NotificationHost.tsx` (web), `library/src/notifications/NotificationHost.native.tsx` (mobile)
- Test: `library/test/NotificationHost.test.tsx`

**Interfaces:**
- Consumes: `useNotificationQueue` (Task 6), MUI `Snackbar`/`Alert` (web), Paper `Snackbar` (native).
- Produces: `NotificationHost` — renders the queue. Web stacks MUI `Snackbar`+`Alert` (tone→severity, `neutral`→`info`); native shows the first queued item in a Paper `Snackbar`.

- [ ] **Step 1: Write the failing test (web)**

`library/test/NotificationHost.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { render, screen, act } from '@testing-library/react';
import { NotificationProvider } from '../src/notifications/NotificationContext.js';
import { NotificationHost } from '../src/notifications/NotificationHost.js';
import { useNotify } from '../src/notifications/useNotify.js';

function Trigger() {
  const { success } = useNotify();
  return createElement('button', { onClick: () => success('Hello there') }, 'go');
}

describe('NotificationHost (web)', () => {
  it('renders a queued notification message', () => {
    const wrapper = (ui: ReactNode) =>
      render(createElement(NotificationProvider, { children: [ui, createElement(NotificationHost, { key: 'h' })] }));
    wrapper(createElement(Trigger, { key: 't' }));
    act(() => { screen.getByText('go').click(); });
    expect(screen.getByText('Hello there')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -w @sublime-ui/library`
Expected: FAIL — cannot resolve `NotificationHost.js`.

- [ ] **Step 3: Write `NotificationHost.tsx` (web)**

```tsx
import { Snackbar, Alert } from '@mui/material';
import { useNotificationQueue, type Tone } from './NotificationContext.js';

const severityOf = (tone: Tone): 'success' | 'error' | 'warning' | 'info' =>
  tone === 'neutral' ? 'info' : tone;

export function NotificationHost() {
  const { queue, dismiss } = useNotificationQueue();
  return (
    <>
      {queue.map((n, i) => (
        <Snackbar
          key={n.id}
          open
          autoHideDuration={n.duration}
          onClose={() => dismiss(n.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          style={{ bottom: 16 + i * 64 }}
        >
          <Alert severity={severityOf(n.tone)} onClose={() => dismiss(n.id)} variant="filled">
            {n.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  );
}
```

- [ ] **Step 4: Write `NotificationHost.native.tsx` (mobile)**

```tsx
import { Snackbar } from 'react-native-paper';
import { useNotificationQueue } from './NotificationContext.js';

export function NotificationHost() {
  const { queue, dismiss } = useNotificationQueue();
  const current = queue[0];
  if (!current) return null;
  return (
    <Snackbar
      visible
      onDismiss={() => dismiss(current.id)}
      duration={current.duration}
      {...(current.action
        ? { action: { label: current.action.label, onPress: current.action.onPress } }
        : {})}
    >
      {current.message}
    </Snackbar>
  );
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm run test -w @sublime-ui/library`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add library/src/notifications/NotificationHost.tsx library/src/notifications/NotificationHost.native.tsx library/test/NotificationHost.test.tsx
git commit -m "feat(library): add NotificationHost (web Snackbar/Alert + native Paper Snackbar)"
```

---

## Task 8: `Button` — the Component Recipe (reference)

**This task establishes the pattern every component (Tasks 9–29) follows.** Read it as the recipe.

**Files:**
- Create: `library/src/components/Button/Button.types.ts`, `Button.tsx`, `Button.native.tsx`, `index.ts`
- Test: `library/test/components/Button.test.tsx`

**Interfaces:**
- Consumes: `useTokens` (Task 4), MUI `Button` (web), Paper `Button` (native).
- Produces: `ButtonProps`, `Button` (cross-platform).

- [ ] **Step 1: Write `Button.types.ts`**

```ts
import type { ReactNode } from 'react';

export type Variant = 'solid' | 'soft' | 'outline' | 'ghost';
export type Tone = 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';
export type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: Variant;
  tone?: Tone;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  fullWidth?: boolean;
  testID?: string;
}
```

- [ ] **Step 2: Write the failing test (web)**

`library/test/components/Button.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWeb } from '../../src/test-utils/renderWeb.js';
import { Button } from '../../src/components/Button/index.js';

describe('Button (web)', () => {
  it('renders its label and fires onPress', () => {
    const onPress = vi.fn();
    renderWeb(createElement(Button, { onPress, children: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledOnce();
  });
  it('disables interaction when disabled', () => {
    const onPress = vi.fn();
    renderWeb(createElement(Button, { onPress, disabled: true, children: 'Nope' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nope' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm run test -w @sublime-ui/library`
Expected: FAIL — cannot resolve `Button/index.js`.

- [ ] **Step 4: Write `Button.tsx` (web/MUI)**

```tsx
import { Button as MuiButton, CircularProgress } from '@mui/material';
import { useTokens } from '../../provider/useTokens.js';
import type { ButtonProps, Variant, Tone } from './Button.types.js';

const muiVariant = (v: Variant): 'contained' | 'outlined' | 'text' =>
  v === 'solid' ? 'contained' : v === 'outline' ? 'outlined' : 'text';

const muiColor = (t: Tone): 'primary' | 'success' | 'error' | 'warning' | 'info' | 'inherit' =>
  t === 'danger' ? 'error' : t === 'neutral' ? 'inherit' : t;

export function Button({
  children, onPress, variant = 'solid', tone = 'primary', size = 'md',
  disabled, loading, fullWidth, testID,
}: ButtonProps) {
  const tokens = useTokens();
  const soft = variant === 'soft';
  return (
    <MuiButton
      variant={muiVariant(variant)}
      color={muiColor(tone)}
      size={size === 'md' ? 'medium' : size === 'sm' ? 'small' : 'large'}
      disabled={disabled || loading}
      fullWidth={fullWidth}
      onClick={onPress}
      data-testid={testID}
      sx={{
        borderRadius: `${tokens.radii.md}px`,
        textTransform: 'none',
        fontWeight: tokens.typography.weights.semibold,
        ...(soft ? { backgroundColor: tokens.color.primarySoftBg, color: tokens.color.primarySoftFg, '&:hover': { backgroundColor: tokens.color.primarySoftBg } } : {}),
      }}
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
    >
      {children}
    </MuiButton>
  );
}
```

- [ ] **Step 5: Write `Button.native.tsx` (mobile/Paper)**

```tsx
import { Button as PaperButton } from 'react-native-paper';
import { useTokens } from '../../provider/useTokens.js';
import type { ButtonProps, Variant } from './Button.types.js';

const paperMode = (v: Variant): 'contained' | 'outlined' | 'text' | 'contained-tonal' =>
  v === 'solid' ? 'contained' : v === 'soft' ? 'contained-tonal' : v === 'outline' ? 'outlined' : 'text';

export function Button({
  children, onPress, variant = 'solid', size = 'md',
  disabled, loading, icon, testID,
}: ButtonProps) {
  const tokens = useTokens();
  return (
    <PaperButton
      mode={paperMode(variant)}
      onPress={onPress}
      disabled={disabled || loading}
      loading={loading}
      icon={icon}
      compact={size === 'sm'}
      testID={testID}
      style={{ borderRadius: tokens.radii.md }}
    >
      {children}
    </PaperButton>
  );
}
```

- [ ] **Step 6: Write `index.ts`**

```ts
export { Button } from './Button.js';
export type { ButtonProps } from './Button.types.js';
```

> Metro resolves `./Button` → `Button.native.tsx`; web/tsc → `Button.tsx`. Both import props from `Button.types.ts`.

- [ ] **Step 7: Run to verify it passes**

Run: `npm run test -w @sublime-ui/library`
Expected: PASS (web button renders + fires).

- [ ] **Step 8: Typecheck (covers the `.native.tsx` too) + commit**

```bash
npm run typecheck -w @sublime-ui/library
git add library/src/components/Button library/test/components/Button.test.tsx
git commit -m "feat(library): add Button component (the cross-platform recipe)"
```

---

## The Component Recipe (Tasks 9–29 follow this)

Every component task creates a folder `library/src/components/<Name>/` with:
1. **`<Name>.types.ts`** — the shared `<Name>Props` (reuse `Variant`/`Tone`/`Size` from a shared `components/common.ts`; create it in Task 9 if not present).
2. **`<Name>.tsx`** — MUI implementation, consuming `useTokens()`, glass-styled via `sx`.
3. **`<Name>.native.tsx`** — Paper implementation, consuming `useTokens()`, glass-styled via `style`.
4. **`index.ts`** — `export { <Name> } from './<Name>.js'; export type { <Name>Props } from './<Name>.types.js';`
5. **`library/test/components/<Name>.test.tsx`** — a web render smoke test via `renderWeb` asserting the key behavior (renders content; primary interaction fires; a tone/variant prop applies). Native impls are covered by typecheck; a `react-test-renderer` mount check is added for components with non-trivial native logic (`Drawer`, `BottomNav`, `Select`).

TDD per component: write the web smoke test → fails → implement `types`/`tsx`/`native.tsx`/`index` → passes → typecheck → commit (`feat(library): add <Name> component`). Each is independent (its own folder) → **safe to fan out in parallel worktrees**.

> First action in Task 9: create `library/src/components/common.ts` exporting the shared `Variant`/`Tone`/`Size` types, and refactor Button to import them (keep Button's behavior identical). Subsequent components import from `common.ts`.

---

## Tasks 9–29: Component catalog (the fan-out)

Each entry: **props** (beyond the common `variant`/`tone`/`size`/`testID`), **web (MUI)** base, **native (Paper)** base, **glass note**, **test focus**.

### Task 9: Text
- Props: `children`, `variant?: 'title'|'subtitle'|'body'|'caption'`, `tone?`, `numberOfLines?`.
- Web: MUI `Typography` (variant→`h6`/`subtitle1`/`body1`/`caption`), color from tokens (`foreground`/`mutedFg`).
- Native: Paper `Text` (variant→MD3 `titleMedium`/`titleSmall`/`bodyMedium`/`bodySmall`), `numberOfLines`.
- Glass: `mutedFg` for caption/subtitle. Test: renders text; caption uses muted color.

### Task 10: Input
- Props: `value`, `onChangeText(text)`, `label?`, `placeholder?`, `error?: string`, `disabled?`, `secureTextEntry?`, `multiline?`.
- Web: MUI `TextField` (`helperText`=error, `error`=!!error, `type`=password when secure).
- Native: Paper `TextInput` (mode `outlined`) + a Paper `HelperText` for error.
- Glass: outlined, `radii.md`, `surfaceBorder`. Test: typing calls `onChangeText`; error text shows.

### Task 11: Card
- Props: `children`, `onPress?`, `padded?` (default true).
- Web: MUI `Paper`/`Card` with glass `sx` (bg `glassBg`, border `glassBorder`, `radii.lg`, `shadows.sm`).
- Native: Paper `Surface`/`View` styled with `glassBg`/`glassBorder`/`radii.lg`.
- Glass: the signature glass card. Test: renders children; `onPress` fires when set.

### Task 12: Badge
- Props: `label`, `tone?`, `variant?: 'solid'|'soft'|'muted'`, `icon?`.
- Web: MUI `Chip` (size small) styled with soft token pair per tone.
- Native: a `View`+`Text` pill using `{tone}SoftBg`/`{tone}SoftFg`, optional Paper `Icon`.
- Glass: soft pills. Test: renders label; soft variant uses soft bg token.

### Task 13: Icon
- Props: `name`, `size?` (number or sm/md/lg), `color?` (token key or literal).
- Web: render an MUI icon slot — accept a `ReactNode` `node?` prop OR a `name` mapped via the app; v1: render `<span className="material-icons">{name}</span>` fallback + `node` passthrough.
- Native: Paper `Icon` (`source={name}`).
- Glass: color from tokens. Test (web): renders the name/node.

### Task 14: Surface
- Props: `children`, `elevation?: 'none'|'sm'|'md'|'lg'`, `padded?`.
- Web: MUI `Box`/`Paper` with token bg + shadow per elevation.
- Native: Paper `Surface` (elevation mapped) + token bg.
- Test: renders children; elevation md applies `shadows.md` (web).

### Task 15: Divider
- Props: `vertical?`, `inset?`.
- Web: MUI `Divider` (orientation) color `divider`.
- Native: Paper `Divider` (or a `View` with `divider` bg for vertical).
- Test: renders a separator (role/structure).

### Task 16: Spinner
- Props: `size?: 'sm'|'md'|'lg'`, `tone?`.
- Web: MUI `CircularProgress` (size mapped, color from tone).
- Native: Paper `ActivityIndicator` (size, color from tone token).
- Test (web): renders progressbar role.

### Task 17: Dialog (Modal)
- Props: `open`, `onClose`, `title?`, `children`, `actions?: ReactNode`.
- Web: MUI `Dialog` + `DialogTitle`/`DialogContent`/`DialogActions`, glass paper.
- Native: Paper `Portal`+`Dialog` (+`Dialog.Title`/`Content`/`Actions`).
- Glass: glass surface. Test (web): open shows title+children; close button calls `onClose`.

### Task 18: Banner (Alert)
- Props: `tone?`, `title?`, `children`, `onClose?`, `action?`.
- Web: MUI `Alert` (severity from tone) styled soft.
- Native: a styled `View` banner (soft token pair) + optional Paper `IconButton` close (Paper has `Banner` but the custom soft style is preferred).
- Test (web): renders message; close fires.

### Task 19: Fab
- Props: `icon`, `onPress`, `tone?`, `label?` (extended).
- Web: MUI `Fab` (+ `variant="extended"` when label).
- Native: Paper `FAB` (+ `label`).
- Glass: glass bg (`fabBg`-style from tokens.surface) + border. Test (web): renders; click fires.

### Task 20: AppBar (Header)  [standard]
- Props: `title`, `onBack?`, `actions?: ReactNode`, `subtitle?`.
- Web: MUI `AppBar`+`Toolbar` (token surface, no glass blur).
- Native: Paper `Appbar.Header` (+ `Appbar.BackAction` when `onBack`, `Appbar.Content`).
- Test (web): renders title; back action fires.

### Task 21: Select
- Props: `value`, `onChange(value)`, `options: { value: string; label: string }[]`, `label?`, `placeholder?`, `disabled?`.
- Web: MUI `Select`+`MenuItem` (with `InputLabel`/`FormControl`).
- Native: Paper `Menu` anchored to a pressable field (controlled open state) listing `Menu.Item`s.
- Glass: glass menu surface. Test (web): selecting an option calls `onChange`. Native: add a `react-test-renderer` mount check.

### Task 22: Avatar
- Props: `source?` (uri), `label?` (initials fallback), `size?`.
- Web: MUI `Avatar` (`src` or initials).
- Native: Paper `Avatar.Image` (source) or `Avatar.Text` (initials).
- Test (web): renders initials when no source.

### Task 23: Tooltip
- Props: `label`, `children`.
- Web: MUI `Tooltip` wrapping children.
- Native: Paper `Tooltip` wrapping children.
- Test (web): renders the child; tooltip title is set (assert the wrapped child renders).

### Task 24: Checkbox
- Props: `checked`, `onChange(checked)`, `label?`, `disabled?`, `tone?`.
- Web: MUI `Checkbox` (+ `FormControlLabel` when label).
- Native: Paper `Checkbox` (or `Checkbox.Item` when label).
- Test (web): toggling calls `onChange` with the new value.

### Task 25: Switch
- Props: `value`, `onValueChange(value)`, `label?`, `disabled?`, `tone?`.
- Web: MUI `Switch` (+ `FormControlLabel`).
- Native: Paper `Switch`.
- Test (web): toggling calls `onValueChange`.

### Task 26: GlassAppBar  [cross-platform glass variant]
- Props: same as AppBar (`title`, `onBack?`, `actions?`, `subtitle?`) + `transparent?`.
- Web: MUI `AppBar` with glass `sx` (bg `glassBg`, `backdropFilter: 'blur(12px)'`, border-bottom `glassBorder`, no elevation).
- Native: Paper `Appbar.Header` styled with `glassBg`/`glassBorder` (translucent), per Gulani `GlassHeader`.
- Glass: the signature translucent header. Test (web): renders title; glass bg applied.

### Task 27: BottomNav  [mobile-only; web stub]
- Props: `items: NavItem[]`, `activeKey`, `onSelect(key)`. `interface NavItem { key: string; label: string; icon: string; badge?: string | number }`.
- Native: a styled bar (Paper `Surface` + pressable items with Paper `Icon` + `Text`, active item uses `primarySoftBg`/`primarySoftFg`, optional Badge). Glass bg.
- Web (`.tsx`): stub — `if (process.env.NODE_ENV !== 'production') console.warn('BottomNav is mobile-only'); return null;`
- Test: native mount check (react-test-renderer) renders items + active highlight; web stub returns null (render asserts empty).

### Task 28: Drawer  [mobile-only; web stub]
- Props: `items: NavItem[]`, `activeKey`, `onSelect(key)`, `header?: ReactNode`, `footer?: ReactNode`.
- Native: the glass drawer panel (per Gulani `StoreDrawerContent`): header slot, a `ScrollView` of soft-tinted icon rows (active row gets `primarySoftBg` fill + accent), footer slot. Uses tokens; NOT coupled to React Navigation (pure presentation given `items`).
- Web (`.tsx`): stub — warn + return null.
- Test: native mount check renders the items and marks the active row; web stub returns null.

### Task 29: NavItem shared type
- Fold into Task 27 (define `NavItem` in `components/common.ts` so both BottomNav and Drawer import it). No separate component; this is a types-only addition done as the first step of Task 27.

> Each of Tasks 9–28 is one fan-out unit: write the web smoke test, implement `types`/`tsx`/`native.tsx`/`index`, run the web test + typecheck, commit. They touch disjoint folders → parallel-safe in worktrees.

---

## Task 30: Public exports + multi-component integration

**Files:**
- Create: `library/src/index.ts`
- Test: `library/test/integration.test.tsx`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: the package's public surface + an end-to-end web proof.

- [ ] **Step 1: Write `index.ts`**

```ts
// theming
export { SublimeProvider } from './provider/SublimeProvider.js';
export type { SublimeProviderProps } from './provider/SublimeProvider.js';
export { useTokens } from './provider/useTokens.js';
export { generateThemes } from './tokens/generateThemes.js';
export { defaultTokens } from './tokens/tokens.js';
export type { SublimeTokens, ColorTokens } from './tokens/tokens.js';
// notifications
export { useNotify } from './notifications/useNotify.js';
// components
export { Button } from './components/Button/index.js';
export type { ButtonProps } from './components/Button/index.js';
export { Text } from './components/Text/index.js';
export { Input } from './components/Input/index.js';
export { Card } from './components/Card/index.js';
export { Badge } from './components/Badge/index.js';
export { Icon } from './components/Icon/index.js';
export { Surface } from './components/Surface/index.js';
export { Divider } from './components/Divider/index.js';
export { Spinner } from './components/Spinner/index.js';
export { Dialog } from './components/Dialog/index.js';
export { Banner } from './components/Banner/index.js';
export { Fab } from './components/Fab/index.js';
export { AppBar } from './components/AppBar/index.js';
export { Select } from './components/Select/index.js';
export { Avatar } from './components/Avatar/index.js';
export { Tooltip } from './components/Tooltip/index.js';
export { Checkbox } from './components/Checkbox/index.js';
export { Switch } from './components/Switch/index.js';
export { GlassAppBar } from './components/GlassAppBar/index.js';
export { BottomNav } from './components/BottomNav/index.js';
export { Drawer } from './components/Drawer/index.js';
export type { NavItem } from './components/common.js';
```

- [ ] **Step 2: Write the integration test**

`library/test/integration.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWeb } from '../src/test-utils/renderWeb.js';
import { Card, Button, Text, Badge, useNotify } from '../src/index.js';

function Panel() {
  const { success } = useNotify();
  return createElement(Card, { children: [
    createElement(Text, { key: 't', children: 'Account' }),
    createElement(Badge, { key: 'b', label: 'active', tone: 'success' }),
    createElement(Button, { key: 'sv', onPress: () => success('Saved!'), children: 'Save' }),
  ]});
}

describe('library integration (web)', () => {
  it('composes components under SublimeProvider and fires a notification', () => {
    renderWeb(createElement(Panel));
    expect(screen.getByText('Account')).toBeTruthy();
    expect(screen.getByText('active')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Saved!')).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run the full library suite**

Run: `npm run test -w @sublime-ui/library`
Expected: PASS across all tasks.

- [ ] **Step 4: Full monorepo gate**

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```
Expected: all green; `library/dist` emits per-file JS + `.d.ts` (web files), `src` shipped for Metro; `.native.tsx` excluded from the web build.

- [ ] **Step 5: Commit**

```bash
git add library/src/index.ts library/test/integration.test.tsx
git commit -m "feat(library): export public API and add integration proof"
```

---

## Self-Review notes (author)

- **Spec coverage:** tokens-first contract (Task 2) + pure `generateThemes` (Task 3) — the customizer seam; `SublimeProvider`+`useTokens` web+native (Tasks 4–5); unified notifications `useNotify`+host (Tasks 6–7); the Component Recipe + 21 components (Task 8 Button; Tasks 9–28 the rest incl. AppBar #20, GlassAppBar #26 cross-platform, BottomNav/Drawer #27–28 mobile-only with web stubs); platform-resolved delivery + build preserving the split (Task 1); public API + integration (Task 30). devkit-server customizer correctly out of scope (tokens are serializable + generateThemes pure → ready for it).
- **Ordering:** Tasks 6–7 (notifications) must land before Task 5 (provider imports the host) — flagged in Task 5. `components/common.ts` (shared Variant/Tone/Size/NavItem) is created at the start of Task 9 and used by Tasks 10–28; Button (Task 8) is refactored to import it in Task 9 Step 1. Recommended order: 1→2→3→4→6→7→5→8→9…→30.
- **Fan-out:** Tasks 9–28 are independent component folders → parallelizable in worktrees; each ends green + committed.
- **Type consistency:** `Variant`/`Tone`/`Size` shared via `common.ts`; `NavItem` shared by BottomNav/Drawer; `ResolvedTokens` from `useTokens` consumed identically by every component; notification `Tone` (5 values incl. `neutral`) is distinct from component `Tone` (6 values incl. `primary`) — intentional, kept in separate modules.
- **Known risks:** (a) the `react-native`/Paper imports won't resolve under jsdom/web tests — web component tests only import web files (`.tsx`), and `.native.tsx` is typecheck-only, so vitest never loads RN. (b) tsup `bundle:false` + platform-file exclusion is the trickiest config (Task 1) — verify `dist` excludes `.native` and `src` ships for Metro. (c) `NotificationContext` contains JSX so it is `.tsx` (imports still use the `./NotificationContext.js` ESM specifier). (d) The `useCallback` import typo guard is noted in Task 6 Step 3.
