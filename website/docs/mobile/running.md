---
sidebar_position: 2
title: Running on Mobile
---

# Running on Mobile

The mobile dev loop is `sublime doctor` once, then `npm run dev:mobile` to build
and launch on a device or emulator. This page is the mobile-specific flow; for the
full three-target picture and toolchain table, see
[Running your app](../getting-started/running.md).

## Step 1 — Check the toolchain with `sublime doctor`

Mobile needs an Android toolchain that web and desktop don't. Before your first
build, run:

```bash
sublime doctor
```

`doctor` prints a ✓/✗ table for Node, **JDK 17**, the Android SDK, NDK, and CMake.
If something is missing, `sublime setup` installs it:

- **Windows:** `sublime setup` installs a portable Temurin JDK 17 into
  `~/.sublime/` without touching your system Java.
- **macOS / Linux:** install Temurin 17 and set `JAVA_HOME`; `setup` walks you
  through the rest.

You only need to do this once per machine. When anything mobile-related looks off,
re-run `sublime doctor` first.

## Step 2 — Run the dev build

```bash
npm run dev:mobile
```

`dev:mobile` runs `sublime build --debug`, which produces a **debug** Android build
and runs it. A debug build loads JavaScript from **Metro**, so your edits hot-reload
on the device — the normal React Native development experience.

This uses your `src/screens/mobile/*.native.tsx` screens behind the React
Navigation tree compiled from `storybook.native.ts`.

> Editing navigation? Re-run `npm run build:nav` (or keep
> `npx sublime build:nav --watch` running) so the generated
> `navigation.native.tsx` and route types stay in sync. A running app uses the
> **compiled** navigation, not your storybook directly.

## Devices and emulators

`sublime build`/`run` target a connected Android device or a running emulator over
adb:

- **Physical device:** enable USB debugging and plug it in.
- **Emulator:** start an Android Virtual Device from Android Studio first.

To install and launch an already-built APK on a specific device:

```bash
sublime run --device <id>
```

`run` installs the build and launches it; `--device` picks a target when more than
one is attached.

## Next

- [Building for Android](./building.md) — the offline release APK and AAB.
- [Common Errors & Fixes](../troubleshooting.md) — JDK 17, SDK components, and
  peer-dependency install issues.
