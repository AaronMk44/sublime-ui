# @sublime-ui/devkit

The [Sublime UI](https://sublime-ui.github.io/sublime-ui/) developer CLI —
code generators, the navigation compiler, desktop tooling, and **standalone
Android APK builds fully offline** (no EAS / cloud build). Bin names: `sublime`
(alias `sui`).

## What "offline" means

- **No cloud build service** — everything runs on your machine via Gradle.
- **Offline runtime** — the default `assembleRelease` build embeds the JS bundle
  and signs with the auto-generated debug keystore, so the APK runs with **no
  Metro server**.
- Not air-gapped: the *first* Gradle build still downloads Maven/AGP artifacts.

## Commands

| Command | What it does |
|---|---|
| `sublime doctor` | Prints a ✓/✗ table for Node, JDK 17, `ANDROID_HOME`, cmdline-tools, platform-tools, NDK 27.1.12297006, CMake 3.22.1. Exits non-zero if a required piece is missing. |
| `sublime setup` | Provisions the **full Android toolchain** (JDK 17 + cmdline-tools + licenses + platform-tools + `android-35` + `build-tools;35.0.0` + NDK 27.1.12297006 + CMake 3.22.1) into `~/.sublime/` — fully automatic on Windows, macOS, and Ubuntu. No admin, no Homebrew/apt, and no environment changes; `doctor`/`build` auto-detect it. Safe to re-run (resumes from the first missing piece). |
| `sublime build [--release\|--debug] [--aab] [--project <path>]` | Runs `expo prebuild` if `android/` is absent, writes `local.properties`, then runs Gradle with a **scoped JDK 17** and self-heals missing NDK/CMake. Default = `assembleRelease`. Note: `--debug` produces a Metro-dependent APK (not offline); `--release` is the offline default. `--aab` produces a Play Store App Bundle (`.aab`, via bundleRelease). |
| `sublime run [--device <id>] [--project <path>]` | `adb install -r` the APK and launches it. |

## Code generators

Scaffold code matching the Sublime UI framework/library conventions. Paths come
from `sublime.config.json` (defaults: `src/models`, `src/components`, `src/theme`).

| Command | Generates |
|---|---|
| `sublime make:model <Name> [--fields "a:string,b:number"] [--resource /path] [--force]` | `models/<Name>.ts` (Model + `declare` fields + `registerModel`) + barrel. No `--fields` → interactive prompts. |
| `sublime make:component <Name> [--mobile-only] [--force]` | `components/<Name>/` quartet (`types`/`tsx`/`native.tsx`/`index`) + barrel. `--mobile-only` → web null stub. |
| `sublime theme:init [--force]` | `theme/tokens.json` (= library defaults) + a typed `theme/tokens.ts` wrapper. |

Generators never overwrite without `--force`; barrel updates are idempotent.

## Navigation compiler

| Command | What it does |
|---|---|
| `sublime build:nav [--watch] [--force] [--project <path>]` | Compiles per-platform storybooks (`storybook.web.ts` / `storybook.native.ts`) into `navigation.tsx` (react-router), `navigation.native.tsx` (React Navigation), a typed route map (`routes.d.ts`), and an index barrel. `--watch` rebuilds on change. |

## Desktop (Electron Forge)

| Command | What it does |
|---|---|
| `sublime desktop:dev [--project <path>]` | Runs the Electron desktop shell in development (`electron-forge start`). |
| `sublime desktop:build [--project <path>]` | Builds distributable desktop artifacts (`electron-forge make`). |

## Robustness (lessons baked in)

- **Self-healing SDK installs.** On `Failed to install … ndk;X / cmake;Y`, the id
  is parsed, installed via `sdkmanager`, and the build retried (max 4 attempts).
- **Corrupt-NDK detection.** An NDK dir missing `source.properties` / `ndk-build`
  / clang is removed and reinstalled.
- **Modern cmdline-tools `sdkmanager` on JDK 17** avoids the legacy
  `NoClassDefFoundError: javax/xml/bind` (JAXB removed after Java 8) crash.
- **Scoped JDK.** Build children get `JAVA_HOME` → JDK 17 for that call only; the
  system default Java is never modified.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `doctor` shows JDK 17 ✗ | Run `sublime setup` — it installs a managed JDK 17 into `~/.sublime/` on any platform. |
| Build fails on `ndk;…`/`cmake;…` | Usually auto-healed; if it persists, check `ANDROID_HOME` is writable. |
| `NoClassDefFoundError javax/xml/bind` | You're invoking the legacy `tools/bin/sdkmanager` on JDK 17 — use cmdline-tools `latest`. |
| `run` finds no device | Start an emulator or plug in a phone with USB debugging; `adb devices`. |

## Scope

Offline Android builds are Android only (iOS needs macOS). `setup`,
`doctor`, `build`, and `run` work on Windows, macOS, and Ubuntu — `setup`
auto-provisions the managed toolchain under `~/.sublime/` on all three.
Generators, `build:nav`, and the desktop commands are cross-platform.

## Documentation

Full CLI reference: **https://sublime-ui.github.io/sublime-ui/docs/devkit**

## License

MIT
