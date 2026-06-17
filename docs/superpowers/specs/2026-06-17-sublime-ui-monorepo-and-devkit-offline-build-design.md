# Sublime UI — Monorepo Foundation + Devkit Offline Android Build — Design

Date: 2026-06-17
Status: Approved (pending written-spec review)

## 1. Program context (the bigger picture)

**Sublime UI** is a TypeScript-only, cross-platform application-development
framework — "write the non-UI parts once, run on mobile / web / desktop." The
framework and the developer's app code are both strictly TypeScript.

Monorepo, **npm workspaces**, packages published under the **`@sublime-ui/*`**
scope. Three framework packages (folders already exist at the Sublime root):

- `@sublime-ui/framework` — core runtime/engine + app architecture primitives.
- `@sublime-ui/library` — design system: styled **React Native Paper** (mobile)
  + styled **MUI** (web/desktop), shadcn/Tailwind-inspired, modern.
- `@sublime-ui/devkit` — developer tooling: the **CLI** that hosts both the
  **code generators** and the **offline build** capability.

### Developer-side app structure imposed by the framework (cross-platform)
`Config` · `Hooks` (incl. a default data-loader hook) · `Services` (static
classes; the only place API calls are made) · `Models/Entities` (embedded in an
`ApiResponse` interface) · `Data` (Redux Toolkit store + slices) · `Utils` —
plus `UI/{mobile,web,desktop}`.

Data flow: **UI → hook → service**. Services are static classes, only callable
from their data-loader hook. Each service gets a generated data-loader hook.

web↔desktop: developer builds the **web** app; framework packages it into an
**Electron** desktop app at build/release. Native-OS needs declared in code as
**signatures** that resolve when the desktop build runs. mobile = RN Paper,
web/desktop = MUI, both reskinned by the framework's custom styles.

### Program decomposition (each is its own spec → plan → implementation)
| # | Sub-project | Depends on |
|---|---|---|
| 0 | Monorepo foundation | — |
| 1 | devkit: offline Android build | 0 |
| 2 | framework: app architecture core | 0 |
| 3 | devkit: code generators | 0, 2 |
| 4 | library: design system | 0 |
| 5 | UI cross-platform + web↔desktop sync | 0, 2, 4 |
| 6 | app starter template | all |

**This spec covers #0 + #1 only.** They are delivered together so the monorepo
ships with one real, working package.

## 2. Part A — Monorepo foundation (#0)

### Workspaces
Root `package.json` declares **npm workspaces** = the existing folders
`framework`, `library`, `devkit`. `sandbox/` is **NOT** a workspace (scratch area
for test apps such as `DemoApp`).

```
Sublime/
  package.json            # root: workspaces, shared scripts
  tsconfig.base.json      # strict TS, shared
  .eslintrc.cjs / .prettierrc
  .gitignore
  framework/   -> @sublime-ui/framework
  library/     -> @sublime-ui/library
  devkit/      -> @sublime-ui/devkit   (the CLI)
  sandbox/     (not a workspace)
```

### Conventions
- **TypeScript strict everywhere**: `strict: true`, `noUncheckedIndexedAccess`,
  `noImplicitOverride`, `exactOptionalPropertyTypes`. ESM. Node >= 18 (dev on 24).
- Build: **tsup** (ESM + `.d.ts`). Typecheck: **tsc --noEmit**. Test: **vitest**.
  Lint/format: **ESLint + Prettier**.
- Each package `package.json` shares a consistent shape: name `@sublime-ui/<name>`,
  `version 0.0.0`, `type: module`, `exports`, `bin` (devkit only), `scripts`
  (`build`, `typecheck`, `test`, `lint`).
- Root scripts fan out across workspaces (`npm run build -ws`, etc.).

### #0 acceptance
- `npm install` at root wires the three workspaces.
- `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test` all pass
  (packages may be near-empty stubs except devkit).

## 3. Part B — devkit offline Android build (#1)

The offline-build capability is implemented as the **first commands of the
`@sublime-ui/devkit` CLI**, not a standalone package, so generators (#3) slot
into the same CLI later.

### CLI surface
- Bin: **`sublime`** with alias **`sui`**. Built on **commander** with an
  extensible subcommand tree.

| Command | Purpose |
|---|---|
| `sublime doctor` | Check env: Node, JDK 17, Android SDK root, cmdline-tools, platform-tools, build-tools, NDK, CMake, `ANDROID_HOME`. Prints ✓/✗ table + exact fixes. Exit non-zero if required pieces missing. |
| `sublime setup` | Auto-install missing (Windows): **portable JDK 17** (Temurin zip into `~/.sublime/`, no admin, system Java untouched), **cmdline-tools**, then `platform-tools` / `platforms;android-XX` / `build-tools;XX` via `sdkmanager` with license acceptance. macOS/Linux: print guided steps. |
| `sublime build [--release\|--debug] [--aab] [--project <path>]` | Ensure `local.properties`; run `expo prebuild --platform android` if `android/` absent; Gradle `assembleRelease` (default) / `assembleDebug` / `bundleRelease` with **scoped JDK 17**; print artifact path + size. |
| `sublime run [--device <id>] [--project <path>]` | adb: pick device, install `-r`, launch main activity, tail for crashes. |

Default build = `assembleRelease` because it embeds the JS bundle and is signed
with the auto-generated debug keystore → standalone, offline-runnable APK.

### Robustness (lessons from the manual build)
1. **Self-healing SDK installs.** `build` runs Gradle; on
   `InstallFailedException: Failed to install ... ndk;X / cmake;Y`, parse the
   exact component id, install via `sdkmanager`, retry (bounded, e.g. 4 attempts,
   no infinite loop). Adapts to any Expo/RN version's pinned NDK/CMake.
2. **Corrupt partial-NDK detection.** Before and after install, validate the NDK dir
   (must contain `source.properties` + `ndk-build` + clang toolchain); if invalid,
   remove and reinstall.
3. **Modern cmdline-tools `sdkmanager`** (run on JDK 17) instead of the legacy
   `tools/bin/sdkmanager` → avoids the `NoClassDefFoundError javax/xml/bind`
   (JAXB removed after Java 8) crash. Entire flow runs on a single JDK (17).
4. **Scoped JDK.** Build child processes get `JAVA_HOME` → JDK 17 for that call
   only; the system default Java is never modified.

### devkit internal layout
```
devkit/
  package.json          # bin: { sublime, sui }
  tsup.config.ts
  src/
    cli.ts              # commander root + version + help
    commands/
      doctor.ts  setup.ts  build.ts  run.ts
    lib/
      requirements.ts   # source-of-truth tool versions + Adoptium/JDK + cmdline-tools URLs
      detect.ts         # env probes; pure version-string parsing
      sdkmanager.ts     # cmdline-tools bootstrap + component install/validate
      jdk.ts            # portable JDK 17 fetch/extract/cache
      gradle.ts         # scoped-env runner + missing-component parser (pure parse fn)
      android.ts        # adb device list / install / launch
    util/
      exec.ts           # process wrapper (execa)
      log.ts            # table / spinner / colored output (picocolors)
  test/                 # vitest
```

### Pure logic isolated for unit testing
- `detect.ts`: parse `java -version`, `adb --version`, sdk component versions.
- `gradle.ts`: `parseMissingSdkComponents(stderr) -> string[]` (e.g.
  `["ndk;27.1.12297006","cmake;3.22.1"]`).
- `requirements.ts`: version compare / "is satisfied" checks.
- `doctor`: given a map of probe results, produce the report model.

These are deterministic and TDD-friendly; system-mutating glue (downloads,
installs) is thin and exercised by the smoke test.

## 4. Testing & verification
- **TDD (vitest)** on the pure logic above, fed captured real tool outputs
  (including the exact Gradle failure text from today).
- **Real smoke test:** run `sublime doctor` then `sublime build` against
  `sandbox/DemoApp` and confirm it reproduces the signed
  `app-release.apk`; run `sublime run` to install/launch on a device. This is
  end-to-end proof on the actual machine.

## 5. Scope boundaries (YAGNI)
- **Android only** (iOS needs macOS) — documented.
- macOS/Linux: `doctor`/`build`/`run` work; `setup` prints guided instructions
  rather than auto-installing.
- **Not air-gapped:** first-ever Gradle build still fetches Maven/AGP; "offline"
  means no cloud build + offline runtime. Documented explicitly.
- No generators in this spec (that is #3).

## 6. Documentation
- Root `README.md`: Sublime UI overview, the package map, how they relate, the
  decomposition roadmap.
- `devkit/README.md`: full CLI reference, "what offline means", setup details,
  troubleshooting derived from today's real failure modes (JAXB crash, partial
  NDK, missing CMake).

## 7. #1 acceptance
- `sublime doctor` correctly reports a fully-equipped and a deliberately-broken env.
- `sublime build` produces a signed standalone APK for `sandbox/DemoApp`,
  self-healing any missing NDK/CMake.
- `sublime run` installs + launches it on a connected device/emulator.
- Unit tests green; typecheck/lint/build green across the monorepo.
