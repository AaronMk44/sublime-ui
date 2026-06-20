---
"@sublime-ui/storage": patch
"@sublime-ui/devkit": patch
---

Fix release bugs found via a cross-platform consumer app:
- storage: emit dist/sqlite/* (bundle:false entry gap) so bundlers resolve the package
- devkit: scaffold pins ^1.0.0 (was ^0.1.0) and adds react-redux
- devkit: scaffold roots wrap in <Provider store={store}> (required by Model.rxAll)
- devkit: scaffold wires the mobile entry (package.json main + registerRootComponent) and adds metro.config.cjs (package-exports) so the mobile target runs
- devkit: doctor detects NDK/CMake by filesystem and the legacy sdkmanager (no more false negatives)
