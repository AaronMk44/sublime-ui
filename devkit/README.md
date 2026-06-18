# @sublime-ui/devkit

The Sublime UI developer CLI. Today it builds **standalone Android APKs fully
offline** — no EAS / cloud build. Bin names: `sublime` (alias `sui`).

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
| `sublime setup` | Windows: installs a **portable Temurin JDK 17** into `~/.sublime/` (no admin; your system Java is untouched). macOS/Linux: prints guided steps. |
| `sublime build [--release\|--debug] [--aab] [--project <path>]` | Runs `expo prebuild` if `android/` is absent, writes `local.properties`, then runs Gradle with a **scoped JDK 17** and self-heals missing NDK/CMake. Default = `assembleRelease`. Note: `--debug` produces a Metro-dependent APK (not offline); `--release` is the offline default. |
| `sublime run [--device <id>] [--project <path>]` | `adb install -r` the APK and launches it. |

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
| `doctor` shows JDK 17 ✗ | `sublime setup` (Windows) or install Temurin 17 + set `JAVA_HOME`. |
| Build fails on `ndk;…`/`cmake;…` | Usually auto-healed; if it persists, check `ANDROID_HOME` is writable. |
| `NoClassDefFoundError javax/xml/bind` | You're invoking the legacy `tools/bin/sdkmanager` on JDK 17 — use cmdline-tools `latest`. |
| `run` finds no device | Start an emulator or plug in a phone with USB debugging; `adb devices`. |

## Scope

Android only (iOS needs macOS). macOS/Linux: `doctor`/`build`/`run` work;
`setup` prints guided steps instead of auto-installing.
