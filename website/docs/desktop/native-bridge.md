---
sidebar_position: 2
title: Native Bridge
---

# Native Bridge

The native bridge lets your web app code call into Node.js and the OS — file
system, dialogs, the shell, the clipboard, OS notifications, and **anything you
add yourself** — through one typed, secure channel.

It has two ends:

- **`defineNative`** — author a native capability (runs in Electron's main
  process; may use Node-only dependencies).
- **`useNative`** — call it from the renderer (your screens), typed and
  feature-detected.

## Define a service

Native logic lives in main-process modules under `src/native/`. They can import
anything Node — these dependencies never reach the web bundle.

```ts
// src/native/printer.service.ts  (main-process only)
import { defineNative } from '@sublime-ui/desktop';
import escpos from 'escpos'; // node-only — bundled into MAIN, never the renderer

export const printer = defineNative('printer', {
  async print(receipt: Receipt): Promise<void> {
    /* ...node code... */
  },
  async listDevices(): Promise<Device[]> {
    /* ... */
  },
});

export type Printer = typeof printer; // the contract type
```

Register the built-ins plus your services once, in the main entry:

```ts
// desktop/src/main/main.ts
registerNative([fs, dialog, shell, clipboard, notifications, printer]);
```

## Call it from a screen

```ts
import { useNative } from '@sublime-ui/desktop';
import type { Printer } from '../../native/printer.service';

function PrintButton({ receipt }: { receipt: Receipt }) {
  const printer = useNative<Printer>('printer');
  // null on plain web → the same screen runs everywhere without `if (isDesktop)`
  return <Button onPress={() => printer?.print(receipt)}>Print</Button>;
}
```

The renderer imports only `import type { Printer }` — erased at build — so node
dependencies stay out of the web bundle. `useNative` returns a typed proxy whose
method calls are forwarded over IPC; errors thrown in main surface as a typed
`NativeError` you can `catch` like a local call.

## How it travels

```
useNative<Printer>('printer').print(receipt)
   → proxy: invoke('printer', 'print', receipt)
   → preload: contextBridge → ipcRenderer.invoke('native:invoke', ...)
   → main:  ipcMain.handle('native:invoke')  // validates (mod, method) ∈ registry
   → registry['printer']['print'](receipt)
```

One generic channel carries every call, so adding a module is just another
`registerNative` entry — no preload edits, no bridge rebuild.

## Built-in services

| Service | Methods |
| --- | --- |
| `fs` | `readFile`, `writeFile`, `exists`, `readDir`, `mkdir`, `remove` |
| `dialog` | `openFile`, `saveFile`, `message` |
| `shell` | `openExternal`, `openPath`, `showItemInFolder` |
| `clipboard` | `readText`, `writeText` |
| `notifications` | `notify({ title, body })` |

## Security

The renderer runs with `contextIsolation: true` and `nodeIntegration: false`. The
preload exposes exactly one function. The main handler rejects any
`(module, method)` pair that is not in the registry, so the renderer can only reach
capabilities you explicitly registered.
