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

Before your first build, run `sublime setup` once — it downloads and installs
the JDK, Android SDK, NDK, and CMake under `~/.sublime`. Then `sublime build`
produces the APK (or `sublime build --aab` for an App Bundle).

```bash
sublime setup            # one-time: provision the Android toolchain
```

`sublime setup` is fully automatic on Windows, macOS, and Ubuntu — no admin
rights and no environment changes. Run `sublime doctor` any time to confirm the
toolchain is detected — see [Running on Mobile](./running.md).

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

The finished `.apk` (or `.aab` with `--aab`) is copied into **`dist/mobile/`** at your
project root, alongside the other platforms' outputs — see
[Where your builds go](/docs/reference/cli#where-your-builds-go).

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
> [Common Errors & Fixes](/docs/reference/troubleshooting).

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

- [Theming on mobile](/docs/core-concepts/theming) — how design tokens drive the Paper theme.
- [Running on Mobile](./running.md) — `sublime doctor`, devices, emulators.
