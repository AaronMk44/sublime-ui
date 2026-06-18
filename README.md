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
