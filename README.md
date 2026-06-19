<div align="center">

# Sublime UI

**Write the non-UI parts of your app once. Run them on mobile, web, and desktop — in TypeScript.**

[Documentation](https://sublime-ui.github.io/sublime-ui/) ·
[Getting Started](https://sublime-ui.github.io/sublime-ui/docs/getting-started/scaffold-a-new-app) ·
[Common Errors](https://sublime-ui.github.io/sublime-ui/docs/troubleshooting) ·
[npm](https://www.npmjs.com/org/sublime-ui)

[![Docs](https://img.shields.io/badge/docs-sublime--ui.github.io-E07A0B)](https://sublime-ui.github.io/sublime-ui/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

</div>

---

## What is Sublime UI?

Sublime UI is a **TypeScript-only, cross-platform application framework**. Most
cross-platform tools make you render one UI everywhere and fight the lowest common
denominator. Sublime takes the opposite stance:

> **Share everything that isn't the UI — models, state, business logic, navigation
> structure, design tokens, native service contracts — and write genuinely native
> UIs per platform.**

Your data layer, theme, and app logic are written once. Your screens are
platform-specific (React Native + Paper on mobile, React + MUI on web; desktop
packages the web UI and adds native capabilities). The result feels native on each
target because it _is_ native on each target.

## Highlights

- **Laravel/Eloquent-style models** — define a model, `registerModel(it)`, and read
  it reactively from any screen (`Task.rxAll()`). CRUD over a Gateway, an
  auto-wired Redux slice, cache-first reads — no boilerplate.
- **Tokens-first design system** — one serializable `SublimeTokens` object drives
  both the MUI (web) and React Native Paper (mobile) themes.
- **Compiled navigation** — author a typed "storybook" per platform; `build:nav`
  compiles it ahead of time into idiomatic React Navigation (mobile) and
  react-router (web) with a fully typed route map. `useNav().turnTo('page', params)`
  is checked at compile time.
- **Secure desktop native bridge** — `defineNative` / `useNative` over a single,
  `contextIsolation`-safe IPC channel; built-in `fs` / `dialog` / `shell` /
  `clipboard` / `notifications`; Electron Forge packaging.
- **Offline Android builds** — `sublime build` produces a signed, standalone APK
  with no cloud build service and no Metro server at runtime.
- **One CLI** — scaffolding, code generators, the navigation compiler, and desktop
  tooling under `sublime`.

## Quick start

Create a new cross-platform app in one command:

```bash
npm create @sublime-ui/app@latest my-app
```

You'll be asked for an app name and which targets to include (web / mobile /
desktop), then it scaffolds a complete, runnable app and installs everything:

```bash
cd my-app
npm run dev:web        # web (Vite)
npm run desktop:dev    # desktop (Electron)
npm run dev:mobile     # Android (after `sublime doctor`)
```

→ Full walkthrough: **[Scaffold a New App](https://sublime-ui.github.io/sublime-ui/docs/getting-started/scaffold-a-new-app)**

## Packages

All packages publish to npm under the **`@sublime-ui`** scope.

| Package | Description |
| --- | --- |
| [`@sublime-ui/framework`](framework/) | Models, typed state, and the reactive data layer |
| [`@sublime-ui/library`](library/) | Tokens-first design system (MUI web / RN Paper mobile) |
| [`@sublime-ui/ui`](ui/) | Cross-platform navigation (storybook → RN Navigation / react-router) + layout primitives |
| [`@sublime-ui/desktop`](desktop/) | Electron packaging + the secure native bridge |
| [`@sublime-ui/devkit`](devkit/) | The `sublime` CLI — scaffolding, generators, `build:nav`, offline Android, desktop tooling |
| [`@sublime-ui/create-app`](create-app/) | `npm create @sublime-ui/app` — the project scaffolder |

## Documentation

Everything lives at **[sublime-ui.github.io/sublime-ui](https://sublime-ui.github.io/sublime-ui/)**:

- [Getting Started](https://sublime-ui.github.io/sublime-ui/docs/getting-started/scaffold-a-new-app) — scaffold and run your first app
- [Learning Path](https://sublime-ui.github.io/sublime-ui/docs/learning-path) — basics to advanced
- [Framework](https://sublime-ui.github.io/sublime-ui/docs/framework/overview),
  [Library](https://sublime-ui.github.io/sublime-ui/docs/library/components/overview),
  [Navigation](https://sublime-ui.github.io/sublime-ui/docs/navigation/storybook),
  [Desktop](https://sublime-ui.github.io/sublime-ui/docs/desktop/overview),
  [Devkit](https://sublime-ui.github.io/sublime-ui/docs/devkit)
- [Cookbook](https://sublime-ui.github.io/sublime-ui/docs/cookbook) — coming from React Native / Flutter / the web
- [Common Errors & Fixes](https://sublime-ui.github.io/sublime-ui/docs/troubleshooting)

## Developing this monorepo

Sublime UI is an npm-workspaces monorepo. To work on the framework itself:

```bash
git clone https://github.com/sublime-ui/sublime-ui.git
cd sublime-ui
npm install --legacy-peer-deps     # the React Native peer graph requires this
npm run build                      # build all packages
npm run typecheck
npm test
npm run lint
```

- The `website/` Docusaurus app and the `sandbox/` scratch apps are **not**
  workspaces and are not published.
- Releases are cut with [Changesets](https://github.com/changesets/changesets) —
  see [`RELEASING.md`](RELEASING.md).
- Design specs and implementation plans live under `docs/superpowers/`.

## License

[MIT](LICENSE) © Aaron Mkandawire and Sublime UI contributors
