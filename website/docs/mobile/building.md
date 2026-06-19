---
sidebar_position: 3
title: Building for Android
---

# Building for Android

Mobile packaging is a **fully offline Android build**, driven by the `sublime` CLI.
There's no cloud build service and no Metro server at runtime — `sublime build`
produces a standalone APK (or AAB) on your machine that runs on its own.

```bash
sublime build            # offline release APK (default)
sublime run              # install + launch the build on a device
```

Run `sublime doctor` first if you haven't set up the Android toolchain — see
[Running on Mobile](./running.md).

## `sublime build`

| Flag | Result |
| --- | --- |
| *(none)* / `--release` | Release APK with the JS bundle **embedded** — the default. |
| `--debug` | Debug APK that loads JS from **Metro** (the `dev:mobile` mode). |
| `--aab` | An Android App Bundle (`.aab`) for the Play Store instead of an APK. |
| `--project <path>` | Build a project in another directory. |

A scaffolded app wires these into npm scripts:

```bash
npm run build:mobile     # sublime build        → standalone offline APK
npm run dev:mobile       # sublime build --debug → debug build (needs Metro)
```

## What "offline" means

A **release** build (`sublime build` / `sublime build --release`) **embeds the
JavaScript bundle inside the APK**. That has two consequences:

- **No Metro at runtime.** The installed app doesn't connect to a dev server to
  fetch JS — the bundle ships inside it. It launches and runs with nothing else
  running on your machine.
- **No cloud build.** The whole compile happens locally with your Android
  toolchain (JDK 17, SDK, NDK, CMake). Nothing is uploaded to a build service.

A **debug** build is the opposite end: it loads JS from Metro for hot reload, which
is exactly what you want while developing and exactly what you *don't* want to
distribute.

> Missing SDK components (`ndk;…`, `cmake;…`) during a build are usually
> auto-healed — the build parses the id, installs it, and retries. If it persists,
> confirm `ANDROID_HOME` is set and writable. See
> [Common Errors & Fixes](../troubleshooting.md).

## `sublime run`

```bash
sublime run [--device <id>] [--project <path>]
```

`run` installs the most recent build and launches it on a connected device or
running emulator. Use `--device` to pick a target when several are attached.

A typical release smoke test:

```bash
sublime build            # produce the offline release APK
sublime run              # install + launch it on the device
```

## The loop at a glance

| Goal | Command | Notes |
| --- | --- | --- |
| Develop with hot reload | `npm run dev:mobile` | `sublime build --debug`; loads JS from Metro |
| Build a distributable APK | `sublime build` | Offline; JS embedded; no Metro |
| Build a Play Store bundle | `sublime build --aab` | Produces an `.aab` |
| Install + launch | `sublime run` | On device/emulator over adb |

## Next

- [Theming on mobile](./theming.md) — how design tokens drive the Paper theme.
- [Running on Mobile](./running.md) — `sublime doctor`, devices, emulators.
