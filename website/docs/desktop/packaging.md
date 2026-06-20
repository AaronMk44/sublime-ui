---
sidebar_position: 3
title: Packaging
---

# Packaging

Desktop packaging is driven by the `sublime` CLI and powered by **Electron Forge**.

```bash
sublime desktop:dev     # Forge start — Webpack dev server + HMR, loads the preload
sublime desktop:build   # Forge make — produces platform installers
```

## What `desktop:build` produces

Electron Forge **makers** generate the installers:

| Platform | Maker | Output |
| --- | --- | --- |
| Windows | `MakerSquirrel` | `.exe` installer |
| macOS | `MakerZIP` | `.zip` |
| Linux | `MakerDeb`, `MakerRpm` | `.deb`, `.rpm` |

The installers are copied into **`dist/desktop/`** at your project root, alongside the
other platforms' outputs (`dist/web`, `dist/mobile`) — see
[Where your builds go](../getting-started/commands.md#where-your-builds-go).

Two Forge plugins harden and complete the build:

- **`plugin-auto-unpack-natives`** unpacks native Node modules from the asar — so a
  `defineNative` service that depends on real native modules (SQLite, serialport,
  escpos) packages correctly.
- **`plugin-fuses`** flips Electron security fuses at package time:
  `OnlyLoadAppFromAsar`, asar integrity validation, and `RunAsNode: false`.

## Where the config lives

The Forge config and webpack configs live **in your app's `desktop/` folder**,
where Forge expects them — not hidden in the framework:

```
desktop/
  forge.config.ts                 # makers + WebpackPlugin + Fuses + AutoUnpackNatives
  webpack.main.config.ts
  webpack.renderer.config.ts
  src/
    main/ main.ts, preload.ts
    renderer/ index.html, index.ts   # mounts the web app
```

`@sublime-ui/desktop` provides the reusable runtime (the bridge, the secure window
shell, and the built-in services); your `desktop/` folder owns the packaging
configuration. In development the renderer loads from the Webpack dev server (with
HMR); in a packaged build it loads from `file://` inside the asar.
