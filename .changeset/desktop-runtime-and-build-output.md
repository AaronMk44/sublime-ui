---
"@sublime-ui/devkit": patch
"@sublime-ui/desktop": patch
---

Fix desktop runtime crashes, polish the scaffold, and consolidate build output.

- **desktop**: add a node-free `@sublime-ui/desktop/preload` export and point the
  scaffolded preload at it, so the preload bundle no longer drags main-process
  services (`node:fs`) into the sandboxed renderer.
- **devkit (desktop webpack)**: the asset-relocator / node-loader now run on the
  **main** build only — running them on the sandboxed renderer/preload injected a
  `__dirname` reference that crashed at runtime. Added `resolve.extensionAlias` so
  `.js` specifiers resolve to `.ts`/`.tsx`.
- **devkit (tokens)**: the scaffold now emits a **complete, valid `SublimeTokens`**
  `tokens.json` (was a partial shape that crashed `generateThemes` at render), and
  `tokens.ts` uses a checked type instead of `as unknown as` so drift fails `tsc`.
- **devkit (navigation)**: generated web navigation uses **`HashRouter`**, so routing
  works in the browser, on static hosts (no rewrites), and inside Electron (dev +
  packaged `file://`).
- **devkit (sample screens)**: the generated web + mobile screens use the design
  system (`Text`/`Card`/`Button`) instead of raw HTML/Paper, so a new app looks
  styled out of the box.
- **devkit (build output)**: every `build:*` now writes into one `dist/` folder —
  web → `dist/web`, desktop → `dist/desktop` (installers), mobile → `dist/mobile`
  (APK/AAB).
