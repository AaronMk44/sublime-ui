---
sidebar_position: 1
title: Overview
---

# Desktop

The desktop target packages your **web UI** inside an Electron shell and gives your
app a typed way to call **native OS / Node.js** capabilities. There is no
desktop-specific UI: the Electron renderer mounts the same web screens and web
navigation the browser uses. Desktop adds reach, not a third design.

Two capabilities make up the desktop target:

- **[Native bridge](./native-bridge.md)** — call Node/OS from your app through a
  single, secure, typed channel, and define your own native modules.
- **[Packaging](./packaging.md)** — `sublime desktop:dev` and
  `sublime desktop:build`, powered by Electron Forge.

## Mental model

```
RENDERER (your web app)        MAIN (Node.js)
  useNative('printer')           registerNative([fs, dialog, printer])
      │  typed proxy                       ▲  registry dispatch
      ▼                                    │
  preload: contextBridge ──invoke──▶ ipcMain.handle('native:invoke')
```

Your app calls `useNative('printer')` and gets a typed proxy (or `null` on plain
web). Calls travel over one generic IPC channel to the main process, which
dispatches to a registered service. Adding a capability never touches the preload
or the bridge — you just register one more service.

See [project structure](./project-structure.md) for how the `desktop/` shell sits
alongside your shared `src/`.
