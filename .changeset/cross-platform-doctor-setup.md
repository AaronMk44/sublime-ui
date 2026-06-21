---
"@sublime-ui/devkit": minor
---

`sublime setup` now provisions the complete Android build toolchain (JDK 17 +
cmdline-tools + licenses + platform-tools + platform + build-tools + NDK +
CMake) automatically on Windows, macOS, and Ubuntu — no admin, no Homebrew/apt.
Everything installs under `~/.sublime/` and is auto-detected by `sublime
doctor` and `sublime build` with no environment changes. The CLI now shows a
download progress bar and numbered phases.
