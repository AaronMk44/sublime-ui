---
title: Native Calls
sidebar_position: 5
---

# Native Calls

Some things a web bundle simply can't do: read a file off disk, pop a save
dialog, talk to a printer, raise an OS notification. **Native calls** are how a
Sublime app reaches those OS and Node.js capabilities — safely, and with full
types — from the same screens that run in the browser.

This is the **desktop native bridge**. Don't confuse it with business-logic
**Services**: those are your own app code, shared across every target. Native
calls cross a process boundary to reach the operating system, and only resolve
when your app runs inside the Electron shell.

## The mental model

Three pieces:

- **`defineNative(name, methods)`** declares a typed service contract in the
  main process — the side that may import Node-only dependencies.
- **`useNative(name)`** returns a typed proxy in the renderer (your screens), or
  `null` on plain web — so the same screen runs everywhere without
  `if (isDesktop)` branches.
- Every method call travels over **one secure, `contextIsolation`-safe IPC
  channel** to the main process, which dispatches to the registered service.

```
useNative('printer').print(receipt)   →   one IPC channel   →   printer.print(receipt)
        renderer                                                      main
```

Because every call shares one channel, adding a capability is just one more
registration — no preload edits, no bridge rebuild.

## Built-ins, and your own

Sublime ships ready-to-use services: `fs`, `dialog`, `shell`, `clipboard`, and
`notifications`. When you need more — a receipt printer, a serial device — you
author your own with `defineNative` and register it alongside them.

The full contract, the IPC path, and the security model live in
[Native Bridge](/docs/desktop/native-bridge). For how the desktop shell fits the
rest of your app, see the [Desktop Overview](/docs/desktop/overview).
