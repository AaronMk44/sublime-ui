# Sublime UI — Desktop (Electron) Packaging + Native Bridge (#5b) — Design

Date: 2026-06-19
Status: Draft (pending written-spec review)

## 1. Program context

**Sublime UI** is a TypeScript-only, cross-platform app framework. This is
sub-project **#5b: the desktop target** — package the web app into an Electron
desktop app and give app code a typed way to call native OS / Node.js. Depends on
#0 (monorepo), #4 (library), #5a (navigation — desktop renders the web UI), all
merged/locked. It introduces a new runtime package **`@sublime-ui/desktop`** plus
two devkit commands (`desktop:dev`, `desktop:build`).

Scope was deliberately narrowed during brainstorming: **web↔desktop state sync is
out** — #5b is exactly (1) package the web UI into Electron, and (2) the native
bridge.

### The idea

The desktop target adds no new UI: Electron's renderer mounts the **same web
screens and web navigation** the browser uses. What desktop adds is **reach** — a
clean, typed, secure way for app code to call into Node/OS, plus a real installable
build. App developers can also define their **own** native capabilities.

## 2. The native bridge

### 2.1 Developer-facing API — `defineNative` + `useNative`

Two ends of one pipe: services are **authored/registered** with `defineNative`, and
**consumed** with the `useNative` hook.

**Author (main process, may use node deps):**

```ts
// src/native/printer.service.ts  (main-process module)
import { defineNative } from '@sublime-ui/desktop';
import escpos from 'escpos';                 // node-only; bundled into MAIN only

export const printer = defineNative('printer', {
  async print(receipt: Receipt): Promise<void> { /* ...node... */ },
  async listDevices(): Promise<Device[]> { /* ... */ },
});
export type Printer = typeof printer;        // the contract type
```

`defineNative(name, methods)` is the public **extension point** — a custom module is
a first-class citizen identical to the built-ins. Each method must be async (all
calls cross an IPC boundary).

**Register once (main entry):**

```ts
registerNative([fs, dialog, shell, clipboard, notifications, printer]);
```

**Consume (renderer / any screen):**

```ts
import { useNative } from '@sublime-ui/desktop/client'; // renderer-safe entry
import type { Printer } from '../../native/printer.service';

const printer = useNative<Printer>('printer');   // null on plain web
await printer?.print(receipt);
```

`useNative<T>(name)` returns a **typed proxy** (or `null` when not running in the
desktop shell), so the same screen runs on web/mobile without `if (isDesktop)`
guards scattered through it.

**Import boundary.** Renderer code imports from `@sublime-ui/desktop/client`
(`useNative`, `defineNative`, contract types, `NativeError`, `createProxy`) — a
barrel that transitively pulls in **no** `node:*`/`electron`, so the web bundle
can never include native code. Main-process code imports from the root
`@sublime-ui/desktop` barrel, which additionally exposes the Electron shell
(`startDesktop`/`createWindow`), the router/preload, `registerNative`, and the
built-in `fs`/`dialog`/`shell`/`clipboard`/`notifications` services. The package
is also marked `"sideEffects": false` so a `useNative`-only import from the root
barrel remains tree-shakeable.

### 2.2 Why the hook (not direct `Service.method()`)

The hook is feature-detected (`null` off-desktop) — graceful by default. A direct
`Service.method()` call would have to **throw** on web. The hook is the better
consumption ergonomics; `defineNative` still provides the structure + registration.

### 2.3 Transport — one generic invoke channel

```
useNative<Printer>('printer').print(receipt)
  → proxy: invoke('printer', 'print', receipt)
  → preload (contextBridge): sublimeNative.invoke(mod, method, ...args)
  → ipcRenderer.invoke('native:invoke', mod, method, args)
  → main: ipcMain.handle('native:invoke')   // validates (mod,method) ∈ registry
  → registry[mod][method](...args)
  → result (or serialized error) back to the awaited proxy call
```

A **single** generic channel carries every native call. Adding a module is one
`registerNative` entry — **no preload edits, no bridge rebuild**. The proxy layered
on top restores full per-method types from the contract type, so the generic
channel costs nothing at the type level.

### 2.4 The clean main/renderer split

The renderer imports only `import type { Printer }` — erased at build — plus the
generated/static string registry of method names. The real impl module is imported
**only by main**. So a service's node deps (sqlite, escpos, serialport) are bundled
into the **main** Webpack build and never enter the renderer/web bundle. This is the
same idea as #4's platform `.native` split, applied along the main↔renderer seam.

### 2.5 Error handling

The main router wraps each dispatch in try/catch. On throw it serializes the error
(`name`, `message`, optional `code`) and rejects the renderer proxy with a typed
`NativeError`, so `try { await fs.readFile(p) } catch (e) { /* NativeError */ }`
behaves like a local async call.

### 2.6 Built-in services

| Service | Methods |
| --- | --- |
| `fs` | `readFile`, `writeFile`, `exists`, `readDir`, `mkdir`, `remove` |
| `dialog` | `openFile`, `saveFile`, `message` |
| `shell` | `openExternal`, `openPath`, `showItemInFolder` |
| `clipboard` | `readText`, `writeText` |
| `notifications` | `notify({ title, body })` (OS-level; complements in-app `useNotify`) |

### 2.7 Security

`contextIsolation: true`, `nodeIntegration: false`. The preload exposes exactly one
function (`invoke`). The main handler rejects any `(module, method)` pair not in the
registry, so the renderer can only reach explicitly registered capabilities.

## 3. Packaging — Electron Forge

Driven by the `sublime` CLI; powered by **Electron Forge** (chosen over
electron-builder, which had issues; mirrors the user's Gulani Stores desktop app).

- `sublime desktop:dev` → wraps `electron-forge start`. The **Webpack plugin** runs
  the renderer dev server + HMR and injects the preload.
- `sublime desktop:build` → wraps `electron-forge make`. **Makers**: `MakerSquirrel`
  (Windows `.exe`), `MakerZIP` (macOS), `MakerDeb` + `MakerRpm` (Linux).
- **`plugin-auto-unpack-natives`** unpacks native node modules from the asar (so
  native-dep services package correctly).
- **`plugin-fuses`** hardens at package time: `OnlyLoadAppFromAsar`, asar integrity
  validation, `RunAsNode: false`.

In dev the renderer loads from the Webpack dev-server URL; in a packaged build it
loads from `file://` inside the asar. The shell's `create-window` reads the Webpack
plugin's injected `MAIN_WINDOW_WEBPACK_ENTRY` / `MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY`
constants.

## 4. Workspace layout (end-user app)

Shared core + platform-specific UI. Screens are **per-platform**; only components,
models, theme, and native service contracts are shared.

```
my-app/
  src/
    components/   # SHARED — design-system quartets
    models/       # SHARED
    theme/        # SHARED
    native/       # SHARED contracts — *.service.ts (main-only impl)
    screens/
      web/        # web screens
      mobile/     # mobile screens
    navigation/   # #5a — storybook.web.ts / storybook.native.ts (+ generated)
  web/            # web entry — mounts the web app
  mobile/         # React Native entry
  desktop/        # #5b — Electron Forge shell (renderer mounts the WEB ui)
    forge.config.ts, webpack.main.config.ts, webpack.renderer.config.ts
    src/
      main/      main.ts (shell + registerNative), preload.ts (bridge)
      renderer/  index.html, index.ts (mounts the web app + web Navigation)
  sublime.config.json   # + { desktop: { nativeDir, app } }
```

**Desktop = web UI.** Mobile and web are the two UI families; desktop packages the
web one and adds only the native bridge.

## 5. Package layout — `@sublime-ui/desktop`

```
desktop/src/
  define-native.ts        # defineNative(name, methods) — service contract+impl (main)
  registry.ts             # registerNative([...]) + lookup/validation (pure)
  errors.ts               # NativeError + serialize/deserialize (pure)
  bridge/
    preload.ts            # contextBridge → sublimeNative.invoke
    main-router.ts        # ipcMain.handle('native:invoke') → registry dispatch + error serialize
    proxy.ts              # renderer proxy factory (method access → invoke) (pure-ish)
  use-native.ts           # useNative<T>(name) hook (renderer)
  shell/
    create-window.ts      # secure BrowserWindow (contextIsolation on, nodeIntegration off)
    main.ts               # Electron app entry (dev URL vs file://)
  services/               # built-ins: fs.ts, dialog.ts, shell.ts, clipboard.ts, notifications.ts
  client.ts               # renderer-safe barrel (@sublime-ui/desktop/client): useNative, defineNative, types, errors, proxy — NO node/electron
  index.ts                # root barrel (main): adds shell + services + registerNative; "sideEffects": false

devkit/src/commands/
  desktop-dev.ts          # wraps electron-forge start (+ cli.ts wiring)
  desktop-build.ts        # wraps electron-forge make
```

`@sublime-ui/desktop` provides the reusable runtime; the Forge config + webpack
configs are **scaffolded into the app's `desktop/` folder** (where Forge expects
them), not bundled into the library.

## 6. Dependencies

- `@sublime-ui/desktop` peers (platform-gated, optional): `electron`, `react`/
  `react-dom`. Forge tooling (`@electron-forge/*`, makers, plugins, webpack) lives
  in the **app's** `desktop/` devDependencies (scaffolded), matching Gulani.
- Devkit reuses `commander`, `util/exec` (to spawn `electron-forge`), `util/log`,
  `picocolors`, and the #3 `loadConfig` (extended with a `desktop` block).

## 7. Testing

- **TDD (vitest)** on pure units: `registry` (registers services; rejects an
  unregistered `mod`/`method`); `errors` (NativeError serialize/deserialize round
  trip); `proxy` (method access → correct `invoke(mod, method, args)`); each built-in
  service's logic against a temp dir / mocked Electron `dialog`/`shell`/`clipboard`.
- **Bridge integration:** a router test that dispatches a registered call end-to-end
  with a fake registry and asserts result + error propagation.
- **Smoke test:** run `desktop:build` against a fixture desktop app and assert an
  installer artifact is produced (gated/skipped where Electron Forge can't run in CI).
- Monorepo typecheck/lint/test/build green.

## 8. Scope & future (YAGNI)

**In #5b v1:** `defineNative` + `useNative` + the generic invoke bridge + registry +
`NativeError`; the secure window shell; built-in `fs`/`dialog`/`shell`/`clipboard`/
`notifications`; `sublime desktop:dev`/`desktop:build` over Electron Forge; the
scaffolded `desktop/` shell.

**Out of scope (future):**
- **Web↔desktop state sync** — explicitly deferred; would ride on the framework's
  store/Gateway, its own sub-project.
- **Auto-update**, system tray, native menu DSL, multi-window.
- A `make:native` generator scaffolding a `*.service.ts` + registration (devkit #3
  follow-up).
- Deep OS integration (global shortcuts, protocol handlers).

## 9. Acceptance criteria

- `defineNative('x', { m })` registers a service; `registerNative([...])` wires
  built-ins + custom modules; an unregistered `(module, method)` call is rejected by
  the main handler.
- In a screen, `const x = useNative<X>('x')` returns a typed proxy on desktop and
  `null` on plain web; `await x?.m(arg)` round-trips over the single `native:invoke`
  channel; an error thrown in main surfaces as a typed `NativeError`.
- A service's node-only dependency is bundled into the main build and never the
  renderer bundle (verified by the renderer using a type-only import).
- `sublime desktop:dev` launches the app with HMR; `sublime desktop:build` produces
  a platform installer via Electron Forge makers, with Fuses + auto-unpack-natives
  enabled.
- The renderer runs with `contextIsolation: true`, `nodeIntegration: false`, exposing
  only `sublimeNative.invoke`.
- Pure units unit-tested; bridge integration tested; monorepo typecheck/lint/test/
  build green.
```
