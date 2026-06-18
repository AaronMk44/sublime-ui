# Sublime UI — Devkit Code Generators (#3) — Design

Date: 2026-06-18
Status: Draft (pending written-spec review)

## 1. Program context

**Sublime UI** is a TypeScript-only, cross-platform app framework. This is
sub-project **#3: `@sublime-ui/devkit` code generators** — new `make:*` / `theme:*`
commands on the existing devkit CLI (commander, built in #1) that scaffold code
matching the **locked** conventions of the framework (#2) and the library (#4).
Depends on #0 + #2 (+ #4 for the component/theme generators), both merged/locked.

### The idea

Laravel-style generators that remove boilerplate for app developers:
`sublime make:model User` writes a ready-to-use Model; `sublime make:component
Card` writes the cross-platform quartet; `sublime theme:init` scaffolds the app's
design tokens. Generators emit code into the **end-user's app**, locating it via
a small project config.

## 2. Project config (`sublime.config.json`)

A JSON file at the app root declares layout; every generator (and, later, the
devkit-server customizer) reads it. Absent keys fall back to fixed defaults:

```json
{
  "modelsDir": "src/models",
  "componentsDir": "src/components",
  "themeDir": "src/theme",
  "importAlias": "@sublime-ui"
}
```

JSON (not `.ts`) so the devkit reads it with no transpile and the future
customizer can rewrite it. No config file → all defaults. The starter template
(#6) ships this file.

## 3. Commands

### 3.1 `make:model`

```
sublime make:model <Name> [--fields "name:string, tags:Tag[]"] [--resource </custom>] [--id-key <id>] [--force]
```

Emits **one** file `<modelsDir>/<Name>.ts` — because per #2, `registerModel`
creates the Gateway + auto-registering slice at runtime, so the developer writes
only the Model:

```ts
import { Model, registerModel } from '@sublime-ui/framework';

export class User extends Model {
  protected static resource = '/users';
  declare id: number;
  declare name: string;
}
registerModel(User);
```

- `<Name>` → `className` (PascalCase), `resource` (`/users`, overridable via
  `--resource`), `sliceName` (`users`), `fileName` (`User.ts`).
- **Fields (option C):** `--fields` parsed (`name:type`, comma-separated;
  `Type[]` for arrays); else **interactive prompts** (field name → type → "add
  another?"); else a minimal `declare id: number` stub. Type mapping:
  `string`/`number`/`boolean` pass through, `X[]` → array, anything else →
  `string` with a printed warning.
- Then updates `<modelsDir>/index.ts` — re-export **and** a side-effect import so
  importing the barrel runs `registerModel` (and thus the slice auto-registers).

### 3.2 `make:component`

```
sublime make:component <Name> [--mobile-only] [--force]
```

Emits the #4 quartet in `<componentsDir>/<Name>/`:
`<Name>.types.ts` (shared props), `<Name>.tsx` (MUI/web), `<Name>.native.tsx`
(Paper/mobile), `index.ts`. `--mobile-only` → the web `.tsx` is the null+dev-warn
stub. Then updates `<componentsDir>/index.ts`. Components default to the glass
aesthetic and the shared `variant`/`tone`/`size` props from `common.ts`.

### 3.3 `theme:init`

```
sublime theme:init [--force]
```

Emits `<themeDir>/tokens.json` (a copy of `@sublime-ui/library`'s
`defaultTokens`) + a typed wrapper `<themeDir>/tokens.ts`:

```ts
import data from './tokens.json';
import type { SublimeTokens } from '@sublime-ui/library';
export const tokens = data as SublimeTokens;
```

`tokens.json` is the serializable file the **future devkit-server customizer**
reads and rewrites; the app passes `tokens` to `<SublimeProvider tokens={tokens}>`.

## 4. Internal structure

```
devkit/src/
  commands/
    make-model.ts        # command glue: parse args, prompt, call generator
    make-component.ts
    theme-init.ts
  lib/generators/
    config.ts            # loadConfig(cwd) -> merged config (pure over fs read)
    names.ts             # deriveNames(name) -> { className, resource, sliceName, fileName } (pure)
    fields.ts            # parseFields(str) -> { name, tsType }[] (pure)
    render-model.ts      # renderModel(opts) -> string (pure)
    render-component.ts  # renderTypes/Web/Native/Index(opts) -> string (pure)
    render-tokens.ts     # renderTokensWrapper() -> string (pure)
    barrel.ts            # updateBarrel(existing, exportLine) -> string, idempotent (pure)
    write.ts             # safe writer: mkdir -p, refuse overwrite without --force
  cli.ts                 # register the new subcommands on the existing program
```

### Pure logic isolated for TDD
`deriveNames`, `parseFields`, all `render*` functions, `updateBarrel`, and the
config merge are deterministic — unit-tested by asserting the produced strings.
The thin command glue (prompts, fs writes) is exercised by a temp-dir smoke test.

## 5. Templating, safety, idempotency

- **Templating:** plain pure TS template functions (string interpolation). No
  template engine — each renderer returns a string that a test asserts exactly.
- **Safety:** `write.ts` refuses to overwrite an existing file unless `--force`,
  printing the path + hint; it `mkdir -p`s parent dirs.
- **Idempotency:** `updateBarrel` adds the export/import only if absent (no dup
  lines), so re-running a generator or editing the barrel by hand is safe.
- **Errors:** invalid `--fields` syntax, a missing `<Name>` arg, or an
  un-writable target produce a clear message + non-zero exit.

## 6. Dependencies

- New: a small prompts library (`@inquirer/prompts`) for interactive field input.
- Reuses the devkit's existing `commander`, `picocolors`, and `util/log` + `util/exec`.

## 7. Testing

- **TDD (vitest)** on the pure units: `deriveNames` (User→/users, Category→
  /categories, edge plurals), `parseFields` (types, arrays, unknown→string+warn),
  `loadConfig` (defaults, overrides, missing file), `renderModel`/`renderComponent*`/
  `renderTokensWrapper` (exact generated strings), `updateBarrel` (insert,
  idempotent, preserve existing).
- **Smoke test:** run each generator into a temp dir; assert the files exist with
  expected content and that `index.ts` barrels updated.
- **End-to-end (post #2/#4 merge):** `make:model` a model into a fixture app and
  `tsc --noEmit` it against the real `@sublime-ui/framework`; `make:component` a
  component and typecheck against `@sublime-ui/library`.

## 8. Scope & future (YAGNI)

**In #3 v1:** `make:model` (REST), `make:component`, `theme:init`; the project
config + defaults; safe, idempotent writes; the pure generators + tests.

**Out of scope (future):**
- **Storage-agnostic Gateway** — a `DbGateway` (e.g. Drizzle/SQLite, local-first)
  alongside the REST `Gateway`, so a Model plugs into a backend **or** a database.
  This is a framework (#2) enhancement; once it lands, `make:model` gains
  `--gateway rest|db` and `registerModel` a driver option. The generated Model
  file is unchanged, so #3 v1 is forward-compatible. (See the roadmap memory.)
- **devkit-server theme customizer** — visual token editor that reads/writes the
  `tokens.json` this spec scaffolds; `theme:set <path> <value>` CLI edits.
- Screen / CRUD-page / slice-relation generators; migrations.

## 9. Acceptance criteria

- `sublime make:model User --fields "name:string, age:number"` writes
  `src/models/User.ts` (declare fields + `resource='/users'` + `registerModel`)
  and updates `src/models/index.ts`; running with no `--fields` prompts
  interactively; with neither, emits an `id`-only stub.
- `sublime make:component Card` writes the four-file quartet under
  `src/components/Card/` and updates the barrel; `--mobile-only` writes a web stub.
- `sublime theme:init` writes `src/theme/tokens.json` (= defaultTokens) + a typed
  `tokens.ts` wrapper.
- Generators read `sublime.config.json` when present, else use defaults; never
  overwrite without `--force`; barrel updates are idempotent.
- Pure generators are unit-tested; a temp-dir smoke test passes; monorepo
  typecheck/lint/test/build green.
