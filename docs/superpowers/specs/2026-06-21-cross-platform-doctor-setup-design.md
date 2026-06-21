# Cross-Platform `doctor` + Auto-Provisioning `setup` — Design

**Date:** 2026-06-21
**Status:** Approved (ready for implementation plan)
**Package:** `@sublime-ui/devkit`

## Goal

Make `sublime setup` a one-shot, no-admin provisioner that installs a complete
Android build toolchain (capable of producing both APK and AAB) on **Windows,
macOS, and Ubuntu**, and make `sublime doctor` detect that managed toolchain
even when no environment variables are set. The CLI must be visually appealing
and show live progress.

## Decisions (locked)

1. **Managed-only install, no env mutation.** Everything lands under
   `~/.sublime/` (`jdk-17/`, `android-sdk/`). `setup` never edits the registry,
   shell profiles, or system Java. Detection gains a *managed fallback* so
   `doctor`/`build` find the toolchain with zero env changes.
2. **Full toolchain in one shot.** `setup` installs JDK 17 + cmdline-tools +
   licenses + `platform-tools` + `platforms;android-35` + `build-tools;35.0.0`
   + `ndk;27.1.12297006` + `cmake;3.22.1`, so `doctor` goes fully green and the
   first `build` is offline.
3. **Fully automatic portable downloads on all three platforms.** No Homebrew,
   no apt, no admin. Mirrors the existing Windows portable-JDK approach.
4. **Two new devkit-only dependencies:** `extract-zip` and `tar` (pure-JS,
   battle-tested). They are dev-time CLI deps and never enter any app runtime
   bundle.

## Why this works with no env changes

`build.ts` already passes `JAVA_HOME` and `ANDROID_HOME` **explicitly** to
Gradle (via `runGradleWithHealing`). So a managed install at `~/.sublime` is
fully functional without persisting anything — we only need *detection* to fall
back to the managed location.

## Scope guard (YAGNI)

- Android toolchain only. No iOS.
- No keystore/signing management. `--aab` produces an unsigned bundle the
  developer signs themselves (unchanged from today).
- No CI-specific path handling beyond the TTY-degradation already specified.

---

## Architecture

### Managed layout

```
~/.sublime/
  jdk-17/                      # Temurin 17 (existing on Windows; now all OS)
    bin/java[.exe]
  android-sdk/                 # NEW managed Android SDK root
    cmdline-tools/latest/bin/sdkmanager[.bat]
    platform-tools/
    platforms/android-35/
    build-tools/35.0.0/
    ndk/27.1.12297006/
    cmake/3.22.1/
```

### Module map (devkit/src)

| File | Change |
| --- | --- |
| `lib/requirements.ts` | Add per-OS/arch `JDK_DOWNLOAD` (mac x64/arm64, linux x64/arm64) and `CMDLINE_TOOLS_URL` (mac, linux). Add a `resolveJdkUrl()` / `resolveCmdlineToolsUrl()` selector keyed on `process.platform` + `process.arch`. |
| `util/download.ts` (new) | Node-native streamed `fetch` → file, with a `(received, total)` progress callback. Replaces all PowerShell download usage. |
| `util/archive.ts` (new) | `extractZip(zip, dest)` (via `extract-zip`) and `extractTarGz(tgz, dest)` (via `tar`). Cross-platform, no shelling out. |
| `lib/jdk.ts` | Generalize `ensureManagedJdk17()` to all platforms: download (zip on Windows, `.tar.gz` on mac/Linux) → extract into `~/.sublime/jdk-17` → normalize the layout so `~/.sublime/jdk-17/bin/java[.exe]` exists (see "JDK layout normalization" below). Remove the "non-Windows throws / expects PATH" branch. Keep the existing `sublimeHomeDir()`. |
| `lib/android-sdk.ts` (new) | `managedSdkDir()` → `~/.sublime/android-sdk`. `ensureManagedSdk()`: if `cmdline-tools/latest/bin/sdkmanager` already exists, return; else download cmdline-tools → extract → fix layout (the zip extracts a top-level `cmdline-tools/` that must be moved to `cmdline-tools/latest/`). |
| `lib/sdkmanager.ts` | Add `acceptLicenses(sdkRoot, jdkHome)` that runs `sdkmanager --licenses` feeding repeated "y\n" on stdin. Reuse existing `ensureComponents()` for the full id set. |
| `lib/probe.ts` | `resolveAndroidHome(env)` falls back to `managedSdkDir()` when env is unset **and** that dir has `cmdline-tools/latest`. JDK probe prefers managed `~/.sublime/jdk-17/bin/java[.exe]` over PATH `java`. |
| `lib/doctor-report.ts` | `ANDROID_HOME` and `JDK 17` rows show the source: `… (managed)` vs `… (env)` vs `… (PATH)`. |
| `commands/setup.ts` | Rewrite to the 5-phase provisioner (below), all platforms, idempotent. |
| `commands/doctor.ts` | Add a banner + one-line verdict; table unchanged in substance. |
| `util/log.ts` | Add `banner()`, `step(i, total, msg)`, a TTY-gated `spinner()` and `progressBar()` helper. |

---

## Data flow

### `sublime setup` (all platforms)

```
banner("Sublime · Android build setup")
[1/5] JDK 17            → ensureManagedJdk17()       (download+extract if absent)
[2/5] Android cmdline-tools → ensureManagedSdk()     (download+extract+layout-fix)
[3/5] Accept licenses   → acceptLicenses(sdkRoot, jdkHome)
[4/5] SDK packages      → ensureComponents(sdkRoot, [platform-tools, platforms;android-35,
                            build-tools;35.0.0, ndk;27.1.12297006, cmake;3.22.1], jdkHome)
[5/5] Verify            → gatherProbes() + buildDoctorReport(); print table
exit 0 if report.ok else 1
```

Every phase short-circuits when its artifact is already present, so re-running
`setup` is safe and resumes from the first incomplete step.

### `sublime doctor`

Unchanged surface. With managed fallback, a machine that ran `setup` shows all
rows green, e.g. `ANDROID_HOME  ~/.sublime/android-sdk (managed)`.

---

## CLI / UX layer

### Target output (TTY)

```
  Sublime · Android build setup

  [1/5] JDK 17 (Temurin)
        ⣾ downloading  [████████████░░░░░░]  64%   42.1/65.0 MB
  [2/5] Android cmdline-tools      ✓ already present
  [3/5] Accept SDK licenses        ✓ 6 accepted
  [4/5] SDK packages               ⣽ build-tools;35.0.0 (4/5)
  [5/5] Verify                     ✓ environment ready

  ✓ Done in 1m 48s — run: sublime build
```

### Helpers (in `util/log.ts`, ~40 lines, no new deps)

- `banner(title)` — heading with surrounding blank lines.
- `step(i, total, msg)` — `  [i/total] msg` (bold/cyan).
- `spinner(text)` → `{ update(text), succeed(text), fail(text), stop() }`.
  Braille frame animation on an interval.
- `progressBar(received, total)` — renders `[████░░░░] 64%  42.1/65.0 MB`,
  redrawn in place with `\r`.

### TTY gating (correctness requirement)

`process.stdout.isTTY` is checked once. When **false** (CI, pipes, redirected
logs), `spinner()` and `progressBar()` degrade to plain single-line status
messages — no `\r`, no ANSI control sequences, no animation timers. This keeps
CI logs clean and prevents control-code spam. Unit tests exercise the
non-TTY branch.

---

## Download / extraction details

### URLs (added to `requirements.ts`)

- **Temurin JDK 17** — Adoptium release assets for: `windows x64` (zip,
  existing), `mac x64`, `mac aarch64`, `linux x64`, `linux aarch64` (all
  `.tar.gz`). Pinned to the same `17.0.x` build already used on Windows.
- **Android cmdline-tools** — Google `commandlinetools-{win,mac,linux}-<build>_latest.zip`,
  same build number across platforms (`11076708`, matching the current Windows URL).

`resolveJdkUrl()` and `resolveCmdlineToolsUrl()` map `(platform, arch)` → URL
and throw a clear "unsupported platform/arch" error for anything outside the
matrix above.

### JDK layout normalization (known gotcha)

The extracted Temurin archive contains a single versioned top-level folder, but
the path to `bin/java` differs by OS:

- **Windows / Linux:** `jdk-17.0.x+y/bin/java[.exe]`
- **macOS:** `jdk-17.0.x+y/Contents/Home/bin/java`

`ensureManagedJdk17()` moves the correct inner directory (the one *containing*
`bin/java[.exe]`) to `~/.sublime/jdk-17`, so the final managed path is always
`~/.sublime/jdk-17/bin/java[.exe]` regardless of OS. Detection (`probe.ts`) and
`build.ts` therefore use one path on every platform. The "find the dir
containing `bin/java`" logic is unit-tested against simulated Windows/Linux/mac
trees.

### cmdline-tools layout fix (known gotcha)

The cmdline-tools zip extracts a top-level `cmdline-tools/` containing
`bin/ lib/ …`. `sdkmanager` requires `<sdk>/cmdline-tools/latest/bin/…`. After
extracting to a temp dir, move the inner `cmdline-tools` → `<sdk>/cmdline-tools/latest`.
This is a pure-path operation and is unit-tested against a simulated tree.

### License acceptance

`sdkmanager --licenses` prompts y/N repeatedly. `acceptLicenses()` writes
enough "y\n" lines to stdin to accept all. Runs scoped to the managed JDK
(`JAVA_HOME`) and SDK root (`--sdk_root`).

---

## Error handling

- Each download/extract failure throws an actionable message (network, disk
  full, unsupported arch). The CLI's top-level catch maps the throw → exit 1.
- `setup` is resumable: idempotent short-circuits mean a re-run continues from
  the first incomplete artifact.
- NDK integrity is already validated by `isValidNdk()`; corrupt installs are
  removed and reinstalled (existing behavior in `ensureComponents`).
- A failed phase prints which phase failed and the remediation (`re-run
  sublime setup` / check network).

---

## Testing strategy

All network/process effects are injected so tests stay hermetic.

**Pure / unit (no network):**
- `resolveJdkUrl` / `resolveCmdlineToolsUrl` — every `(platform, arch)` row +
  the unsupported-arch throw.
- cmdline-tools layout-fix — simulated extracted tree → correct
  `cmdline-tools/latest` move.
- `acceptLicenses` — stdin payload construction (count of "y" lines, args).
- `resolveAndroidHome` managed fallback — temp dir with/without
  `cmdline-tools/latest`; env-set takes precedence over managed.
- JDK probe — prefers managed `bin/java` over PATH when present.
- `doctor-report` — managed/env/PATH source suffix in details.
- `log` helpers — `progressBar` string formatting; spinner/bar **non-TTY**
  degradation (plain lines, no control codes).

**Integration (injected runners, no real downloads):**
- `setup` phase orchestration via injected `download`/`extract`/`installer`
  fakes: verifies phase order, idempotent short-circuit, and exit codes for
  success and mid-phase failure.

**Existing coverage preserved:** `gradle.ts` self-healing and
`ensureComponents` tests remain green; `setup` now feeds them a managed SDK.

---

## Out of scope / future

- Persisting env vars to shell profiles / registry (explicitly declined —
  managed-only chosen).
- iOS toolchain, keystore/signing, CI cache priming.
- A `sublime setup --system` mode that *does* write env vars (possible future
  addition; not built now).
