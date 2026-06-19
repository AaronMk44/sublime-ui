# Sublime UI — Desktop (Electron) Packaging + Native Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `@sublime-ui/desktop` package — a typed native bridge (`defineNative` + `useNative` over one secure generic IPC channel) and an Electron Forge shell — plus `sublime desktop:dev` / `desktop:build` devkit commands that package the web UI into a desktop app.

**Architecture:** Native services are authored with `defineNative` (main process, may use node deps) and registered with `registerNative`. The renderer calls `useNative<T>(name)` → a typed proxy that forwards each method over a single `native:invoke` IPC channel; the main router validates `(mod, method)` against the registry and dispatches. Errors serialize to a typed `NativeError`. Packaging is Electron Forge (Webpack plugin + Squirrel/ZIP/Deb/Rpm makers + Fuses + auto-unpack-natives), mirroring the Gulani desktop app.

**Tech Stack:** TypeScript (strict), Electron, `@electron-forge/*`, React, tsup, vitest, commander (devkit).

## Global Constraints

- TS strict flags ON (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noUnusedLocals`). ESM only.
- Native calls are always async (they cross an IPC boundary).
- Security: `contextIsolation: true`, `nodeIntegration: false`; preload exposes exactly one function (`sublimeNative.invoke`); the main handler rejects any `(module, method)` not in the registry.
- The renderer must import native service modules **type-only** (`import type`) so node deps never enter the renderer bundle.
- One generic IPC channel `native:invoke`; adding a module is a `registerNative` entry — never a preload/bridge edit.
- Electron peers are **optional** peerDependencies; Forge tooling lives in the app's scaffolded `desktop/` folder, not in the library.
- Commit messages: conventional commits, **no AI/Claude attribution of any kind**.
- Add `desktop` to the root `package.json` `workspaces` array (it is an explicit list, not a glob).
- Test command: `npm test` per workspace runs `vitest run --passWithNoTests`.

---

### Task 1: Scaffold `@sublime-ui/desktop` package

**Files:**
- Create: `desktop/package.json`, `desktop/tsconfig.json`, `desktop/tsup.config.ts`, `desktop/vitest.config.ts`, `desktop/src/index.ts`
- Modify: root `package.json` (`workspaces`)

**Interfaces:**
- Produces: buildable workspace `@sublime-ui/desktop`; `desktop/src/index.ts` public barrel.

- [ ] **Step 1: Write `desktop/package.json`**

```json
{
  "name": "@sublime-ui/desktop",
  "version": "0.0.0",
  "type": "module",
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  "files": ["dist", "src"],
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests",
    "lint": "eslint src"
  },
  "peerDependencies": { "electron": ">=30", "react": ">=18" },
  "peerDependenciesMeta": { "electron": { "optional": true }, "react": { "optional": true } },
  "devDependencies": {
    "@types/node": "^22",
    "@types/react": "^18.3.12",
    "electron": "^33.0.0",
    "react": "^18.3.1",
    "@testing-library/react": "^16.0.1",
    "jsdom": "^25.0.1"
  }
}
```

- [ ] **Step 2:** Write `desktop/tsconfig.json` (copy `library/tsconfig.json`; `jsx: react-jsx`).
- [ ] **Step 3:** Write `desktop/tsup.config.ts` (esm, `dts: true`, `clean: true`, `bundle: false`, `external: ['electron', 'react', 'react-dom']`).
- [ ] **Step 4:** Write `desktop/vitest.config.ts` (jsdom env).
- [ ] **Step 5:** Write `desktop/src/index.ts` → `export {};`.
- [ ] **Step 6:** Add `"desktop"` to root `package.json` `workspaces`.
- [ ] **Step 7:** Run `npm install && npm -w @sublime-ui/desktop run build && npm -w @sublime-ui/desktop run typecheck && npm -w @sublime-ui/desktop test`. Expected: dist emitted, typecheck clean, tests pass.
- [ ] **Step 8: Commit** `git add desktop package.json package-lock.json && git commit -m "feat(desktop): scaffold @sublime-ui/desktop package"`

---

### Task 2: `NativeError` + serialization

**Files:**
- Create: `desktop/src/errors.ts`, `desktop/test/errors.test.ts`

**Interfaces:**
- Produces: `class NativeError extends Error { code?: string }`; `serializeError(e: unknown): SerializedError`; `deserializeError(s: SerializedError): NativeError`; `interface SerializedError { name: string; message: string; code?: string }`.

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest';
import { NativeError, serializeError, deserializeError } from '../src/errors';

describe('native errors', () => {
  it('round-trips a thrown error through serialize/deserialize', () => {
    const s = serializeError(Object.assign(new Error('disk full'), { code: 'ENOSPC' }));
    expect(s).toEqual({ name: 'Error', message: 'disk full', code: 'ENOSPC' });
    const e = deserializeError(s);
    expect(e).toBeInstanceOf(NativeError);
    expect(e.message).toBe('disk full');
    expect(e.code).toBe('ENOSPC');
  });
  it('serializes a non-Error throwable', () => {
    expect(serializeError('boom')).toEqual({ name: 'Error', message: 'boom' });
  });
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3:** implement `errors.ts` (NativeError sets `name='NativeError'`, optional `code`; serialize reads `name/message/code`, coerces non-Errors via `String(e)`; deserialize builds a NativeError, conditionally assigning `code` to satisfy `exactOptionalPropertyTypes`). **Step 4: Run** → PASS. **Step 5: Commit** `git commit -am "feat(desktop): NativeError + serialize/deserialize"`

---

### Task 3: Native registry

**Files:**
- Create: `desktop/src/types.ts`, `desktop/src/registry.ts`, `desktop/test/registry.test.ts`

**Interfaces:**
- Produces:
  - `types.ts`: `type NativeMethods = Record<string, (...args: any[]) => Promise<any>>`; `interface NativeService<M extends NativeMethods = NativeMethods> { name: string; methods: M }`.
  - `registry.ts`: `registerNative(services: NativeService[]): void`; `resolve(mod: string, method: string): ((...a: any[]) => Promise<any>) | undefined`; `clearRegistry(): void` (test seam).

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { registerNative, resolve, clearRegistry } from '../src/registry';

beforeEach(() => clearRegistry());

describe('registry', () => {
  it('resolves a registered method and returns undefined otherwise', () => {
    registerNative([{ name: 'fs', methods: { readFile: async () => 'x' } }]);
    expect(typeof resolve('fs', 'readFile')).toBe('function');
    expect(resolve('fs', 'nope')).toBeUndefined();
    expect(resolve('shell', 'openExternal')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3:** implement a module-level `Map<string, NativeService>`; `resolve` looks up `services.get(mod)?.methods[method]`. **Step 4: Run** → PASS. **Step 5: Commit** `git commit -am "feat(desktop): native service registry"`

---

### Task 4: `defineNative`

**Files:**
- Create: `desktop/src/define-native.ts`, `desktop/test/define-native.test.ts`

**Interfaces:**
- Consumes: `types.ts`.
- Produces: `defineNative<M extends NativeMethods>(name: string, methods: M): NativeService<M>` — returns `{ name, methods }`, typed so `typeof service` carries the method signatures for the renderer contract type.

- [ ] **Step 1: Write failing test** — `defineNative('printer', { print: async () => {} })` returns `{ name:'printer', methods }`, and `service.methods.print` is callable. **Step 2: Run** → FAIL. **Step 3:** implement (trivial wrapper, but typed). **Step 4: Run** → PASS. **Step 5: Commit** `git commit -am "feat(desktop): defineNative service authoring helper"`

---

### Task 5: Renderer proxy factory

**Files:**
- Create: `desktop/src/bridge/proxy.ts`, `desktop/test/bridge/proxy.test.ts`

**Interfaces:**
- Produces: `createProxy<M extends NativeMethods>(mod: string, invoke: (mod: string, method: string, args: unknown[]) => Promise<unknown>): M` — a `Proxy` whose every property access returns a function that calls `invoke(mod, prop, args)`.

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect, vi } from 'vitest';
import { createProxy } from '../../src/bridge/proxy';

describe('createProxy', () => {
  it('turns method access into invoke(mod, method, args)', async () => {
    const invoke = vi.fn().mockResolvedValue('ok');
    const p = createProxy<{ print: (r: number) => Promise<string> }>('printer', invoke);
    await expect(p.print(7)).resolves.toBe('ok');
    expect(invoke).toHaveBeenCalledWith('printer', 'print', [7]);
  });
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3:** implement with `new Proxy({}, { get: (_t, prop) => (...args) => invoke(mod, String(prop), args) })`. **Step 4: Run** → PASS. **Step 5: Commit** `git commit -am "feat(desktop): renderer native proxy factory"`

---

### Task 6: Main IPC router

**Files:**
- Create: `desktop/src/bridge/main-router.ts`, `desktop/test/bridge/main-router.test.ts`

**Interfaces:**
- Consumes: `registry.resolve`, `errors.serializeError`.
- Produces: `installNativeRouter(ipcMain: { handle(channel: string, listener: (e: unknown, ...a: any[]) => any): void }): void` — registers `native:invoke`; the handler resolves `(mod, method)`, rejects unregistered pairs with a `NativeError`, calls the impl, and on throw returns `{ __nativeError: SerializedError }` (the preload/proxy rethrows). Accepts an injected `ipcMain` for testability.

- [ ] **Step 1: Write failing test** — build a fake `ipcMain` capturing the handler; register a service via `registerNative`; assert: a valid call returns the resolved value; an unregistered `(mod,method)` throws/returns a serialized `NativeError`; a throwing impl returns the serialized error shape.
- [ ] **Step 2: Run** → FAIL. **Step 3:** implement (the handler signature `(_event, mod, method, args)`; on success `return await fn(...args)`; on missing → throw `new NativeError('Unknown native method ' + mod + ':' + method)`; wrap in try/catch → `serializeError`). Decide one error convention (reject vs `{__nativeError}`) and keep it consistent with the proxy in Task 8. **Step 4: Run** → PASS. **Step 5: Commit** `git commit -am "feat(desktop): main native:invoke router"`

---

### Task 7: Preload bridge

**Files:**
- Create: `desktop/src/bridge/preload.ts`, `desktop/test/bridge/preload.test.ts`

**Interfaces:**
- Produces: `exposeNativeBridge(contextBridge, ipcRenderer): void` — calls `contextBridge.exposeInMainWorld('sublimeNative', { invoke: (mod, method, args) => ipcRenderer.invoke('native:invoke', mod, method, args) })`. Injected args for testability.

- [ ] **Step 1: Write failing test** — fake `contextBridge`/`ipcRenderer`; assert `exposeInMainWorld` called with key `'sublimeNative'` and that the exposed `invoke` forwards to `ipcRenderer.invoke('native:invoke', ...)`. **Step 2: Run** → FAIL. **Step 3:** implement. **Step 4: Run** → PASS. **Step 5: Commit** `git commit -am "feat(desktop): preload contextBridge native bridge"`

---

### Task 8: `useNative` hook

**Files:**
- Create: `desktop/src/use-native.ts`, `desktop/test/use-native.test.tsx`

**Interfaces:**
- Consumes: `createProxy`, `deserializeError`.
- Produces: `useNative<M extends NativeMethods>(name: string): M | null` — reads `window.sublimeNative`; returns `null` when absent (plain web); otherwise returns `createProxy(name, invoke)` where `invoke` calls `window.sublimeNative.invoke` and rethrows a deserialized `NativeError` if the result is a `{__nativeError}` envelope.

- [ ] **Step 1: Write failing test** — with `window.sublimeNative` undefined, `useNative('fs')` returns `null`; with a stub `invoke`, the proxy forwards and a `{__nativeError}` envelope is rethrown as a `NativeError`. (Render via `@testing-library/react` `renderHook`.) **Step 2: Run** → FAIL. **Step 3:** implement. **Step 4: Run** → PASS. **Step 5: Commit** `git commit -am "feat(desktop): useNative hook"`

---

### Task 9: Secure window shell

**Files:**
- Create: `desktop/src/shell/create-window.ts`, `desktop/test/shell/create-window.test.ts`

**Interfaces:**
- Produces: `createWindow(opts: { entry: string; preload: string; BrowserWindowCtor?: ... }): BrowserWindow` — constructs a `BrowserWindow` with `webPreferences: { contextIsolation: true, nodeIntegration: false, preload: opts.preload }` and loads `opts.entry`. `BrowserWindowCtor` injectable for testing.

- [ ] **Step 1: Write failing test** — inject a fake `BrowserWindow` ctor; assert it is constructed with `contextIsolation: true`, `nodeIntegration: false`, and the given preload, and that `loadURL`/`loadFile` is called with `entry`. **Step 2: Run** → FAIL. **Step 3:** implement. **Step 4: Run** → PASS. **Step 5: Commit** `git commit -am "feat(desktop): secure BrowserWindow shell"`

---

### Task 10: Electron app entry

**Files:**
- Create: `desktop/src/shell/main.ts`, `desktop/test/shell/main.test.ts`

**Interfaces:**
- Consumes: `createWindow`, `installNativeRouter`.
- Produces: `startDesktop(opts: { app; ipcMain; entry; preload; isDev: boolean }): void` — on `app.whenReady()`, installs the router and creates the window (dev: `loadURL` the entry; prod: `loadFile`). Injected `app`/`ipcMain` for tests.

- [ ] **Step 1: Write failing test** — fake `app` (immediately-resolving `whenReady`), fake `ipcMain`; assert `installNativeRouter` ran and a window was created. **Step 2: Run** → FAIL. **Step 3:** implement. **Step 4: Run** → PASS. **Step 5: Commit** `git commit -am "feat(desktop): electron app entry startDesktop"`

---

### Task 11: Built-in `fs` service

**Files:**
- Create: `desktop/src/services/fs.ts`, `desktop/test/services/fs.test.ts`

**Interfaces:**
- Produces: `export const fs = defineNative('fs', { readFile, writeFile, exists, readDir, mkdir, remove })` over `node:fs/promises`. Signatures: `readFile(path): Promise<string>`, `writeFile(path, data): Promise<void>`, `exists(path): Promise<boolean>`, `readDir(path): Promise<string[]>`, `mkdir(path): Promise<void>`, `remove(path): Promise<void>`.

- [ ] **Step 1: Write failing test** — against a temp dir (`node:os` tmpdir + unique): write → read round-trip; `exists` true/false; `readDir` lists; `remove` deletes. **Step 2: Run** → FAIL. **Step 3:** implement over `node:fs/promises` (`mkdir` recursive; `remove` = `rm` recursive+force). **Step 4: Run** → PASS. **Step 5: Commit** `git commit -am "feat(desktop): built-in fs service"`

---

### Task 12: Built-in `dialog` / `shell` / `clipboard` / `notifications`

**Files:**
- Create: `desktop/src/services/dialog.ts`, `desktop/src/services/shell.ts`, `desktop/src/services/clipboard.ts`, `desktop/src/services/notifications.ts`, `desktop/test/services/electron-services.test.ts`

**Interfaces:**
- Produces (each `defineNative` over the matching Electron API, with the Electron module imported lazily so unit tests can mock it):
  - `dialog`: `openFile(): Promise<string|null>`, `saveFile(): Promise<string|null>`, `message(opts): Promise<void>`.
  - `shell`: `openExternal(url): Promise<void>`, `openPath(p): Promise<void>`, `showItemInFolder(p): Promise<void>`.
  - `clipboard`: `readText(): Promise<string>`, `writeText(t): Promise<void>`.
  - `notifications`: `notify({ title, body }): Promise<void>`.

- [ ] **Step 1: Write failing tests** — `vi.mock('electron', …)` with fakes; assert each method calls the right Electron API and maps the result (e.g. `dialog.openFile` returns `filePaths[0]` or `null` when canceled). **Step 2: Run** → FAIL. **Step 3:** implement (access Electron via a small `getElectron()` indirection that the test mocks). **Step 4: Run** → PASS. **Step 5: Commit** `git commit -am "feat(desktop): built-in dialog/shell/clipboard/notifications services"`

---

### Task 13: Public barrel + exports

**Files:**
- Create: `desktop/src/services/index.ts`
- Modify: `desktop/src/index.ts`

**Interfaces:**
- Produces: `@sublime-ui/desktop` exports `defineNative`, `registerNative`, `useNative`, `createWindow`, `startDesktop`, `exposeNativeBridge`, `installNativeRouter`, `NativeError`, all types, and the built-in services (`fs`, `dialog`, `shell`, `clipboard`, `notifications`).

- [ ] **Step 1:** write `services/index.ts` re-exporting the five services. **Step 2:** write `index.ts` re-exporting the public API above. **Step 3:** Run `npm -w @sublime-ui/desktop run build && npm -w @sublime-ui/desktop run typecheck` → `dist/index.d.ts` emitted, clean. **Step 4: Commit** `git commit -am "feat(desktop): public barrel exports"`

---

### Task 14: `sublime desktop:dev` command

**Files:**
- Create: `devkit/src/commands/desktop-dev.ts`, `devkit/test/commands/desktop-dev.test.ts`
- Modify: `devkit/src/cli.ts`, `devkit/src/lib/generators/config.ts` (add optional `desktop` block)

**Interfaces:**
- Consumes: `util/exec`, `util/log`, `loadConfig`.
- Produces: `desktopDev(opts: { project: string; runner?: (cmd, args, cwd) => Promise<number> }): Promise<number>` — resolves the app's `desktop/` dir from config (default `desktop`), spawns `electron-forge start` there, returns its exit code. Adds `desktop?: { dir?: string; nativeDir?: string }` to `GeneratorConfig`.

- [ ] **Step 1: Write failing test** — inject a fake `runner`; assert `desktopDev` invokes it with `electron-forge`, `['start']`, and the resolved desktop dir; returns the runner's code. **Step 2: Run** → FAIL. **Step 3:** implement + register `program.command('desktop:dev')` in `cli.ts`. **Step 4: Run** → PASS. **Step 5: Commit** `git commit -am "feat(devkit): sublime desktop:dev command"`

---

### Task 15: `sublime desktop:build` command

**Files:**
- Create: `devkit/src/commands/desktop-build.ts`, `devkit/test/commands/desktop-build.test.ts`
- Modify: `devkit/src/cli.ts`

**Interfaces:**
- Produces: `desktopBuild(opts: { project: string; runner? }): Promise<number>` — spawns `electron-forge make` in the desktop dir; returns its exit code; non-zero on failure.

- [ ] **Step 1: Write failing test** — fake runner; assert `electron-forge make` invoked in the desktop dir; propagates exit code. **Step 2: Run** → FAIL. **Step 3:** implement + register `desktop:build` in `cli.ts`. **Step 4: Run** → PASS. **Step 5: Commit** `git commit -am "feat(devkit): sublime desktop:build command"`

---

### Task 16: App `desktop/` scaffold templates + end-to-end

**Files:**
- Create: `devkit/src/lib/desktop/templates.ts` (pure string renderers), `devkit/test/desktop/templates.test.ts`, fixture `devkit/test/fixtures/desktop-app/`
- Modify: none (verification + templates)

**Interfaces:**
- Produces: pure renderers for the scaffolded files — `renderForgeConfig()`, `renderWebpackMain()`, `renderWebpackRenderer()`, `renderMainTs()`, `renderPreloadTs()` — emitting the Gulani-style Forge setup wired to `@sublime-ui/desktop` (`startDesktop` in `main.ts`, `exposeNativeBridge` in `preload.ts`, the Webpack plugin entry points, Squirrel/ZIP/Deb/Rpm makers, Fuses, AutoUnpackNatives). These feed the future `make:desktop` generator and document the expected app layout.

- [ ] **Step 1: Write failing tests** — assert `renderForgeConfig()` contains `MakerSquirrel`, `AutoUnpackNativesPlugin`, `FusesPlugin`, `WebpackPlugin`; `renderMainTs()` imports `startDesktop` from `@sublime-ui/desktop`; `renderPreloadTs()` calls `exposeNativeBridge`. **Step 2: Run** → FAIL. **Step 3:** implement the renderers (exact strings). **Step 4: Run** → PASS.
- [ ] **Step 5: Full monorepo gate.** Run: `npm run -ws --if-present typecheck && npm run -ws --if-present lint && npm test -ws --if-present && npm run -ws --if-present build`. Expected: all green.
- [ ] **Step 6: Commit** `git commit -am "feat(devkit): desktop scaffold templates + e2e green"`

---

## Self-Review

**Spec coverage:** §2.1 API → Tasks 4,8; §2.3 transport (proxy/preload/router) → Tasks 5,6,7; §2.4 split → enforced by type-only import (Task 8 + constraints); §2.5 errors → Task 2 (used in 6,8); §2.6 built-ins → Tasks 11,12; §2.7 security → Tasks 7,9; §3 packaging → Tasks 14,15,16; §5 package layout → Tasks 1,13; §7 testing → every task. Covered.

**Placeholder scan:** No TBD/TODO. The one cross-task contract to keep aligned — the error envelope between the router (Task 6) and the proxy/hook (Task 8) — is called out explicitly in both tasks (decide reject vs `{__nativeError}` once, keep consistent).

**Type consistency:** `NativeService`/`NativeMethods` from Task 3 `types.ts` flow into Tasks 4,5,8; `serializeError`/`SerializedError`/`NativeError` from Task 2 into Tasks 6,8; `createProxy`'s `invoke` signature (Task 5) matches `useNative`'s `invoke` (Task 8) and the preload's exposed `invoke` (Task 7). `installNativeRouter`/`exposeNativeBridge`/`createWindow`/`startDesktop` names consistent across Tasks 6,7,9,10,13,16.
