# SP1 — CI assertions

Three guards keep the storage-agnostic gateway honest in CI.

## 1. Core purity (automated, in-repo)

`framework/test/no-native-imports.test.ts` greps every `framework/src/**` source
file and fails if any imports `better-sqlite3`, `expo-sqlite`, `idb`, or
`electron`. The companion `storage/test/web-bundle-purity.test.ts` does the same
for the storage **web** path (`storage/src/web.ts`,
`storage/src/createDatabaseAdapter.web.ts`), asserting neither statically imports
native SQLite (`better-sqlite3` / `expo-sqlite`) — the desktop branch reaches
SQLite only through `@sublime-ui/desktop/client` `getNative` (a renderer-safe
proxy) plus a type-only `SqliteContract`, and `mobile.ts` reaches `expo-sqlite`
via a dynamic `import()` that is off the web path. Both guards run on every PR via
`npm test`.

> Lint-time mirror (optional follow-up): an ESLint `no-restricted-imports` /
> `import/no-restricted-paths` rule scoped to `framework/src/**` (in
> `eslint.config.js`, via `eslint-plugin-import`) enforces the same constraint at
> `npm run lint` time. The vitest source-grep above is the authoritative,
> dependency-free gate and is sufficient on its own.

## 2. Packaged-desktop native module (out-of-band, desktop build job)

`better-sqlite3` is a native module and must be unpacked from the asar so the
Electron MAIN process can `require` it at runtime. After a desktop `make`, CI
asserts:

- `app.asar.unpacked/node_modules/better-sqlite3/build/Release/better_sqlite3.node`
  exists in the packaged output (mitigates electron/forge#3934). A shell step:

  ```bash
  test -f "$(find out -path '*app.asar.unpacked*better_sqlite3.node' | head -n1)" \
    || { echo 'better-sqlite3.node missing from app.asar.unpacked'; exit 1; }
  ```

- `better-sqlite3` is marked `external` in the Vite **main** build config (it must
  not be bundled). Assert the string `external` + `better-sqlite3` co-occur in the
  desktop main Vite/forge config, or inspect the build manifest.

These run only in the desktop packaging job (they need a real `make`), not in the
fast unit-test job.

## 3. SQLite JSON1 startup probe (runtime, asserted in storage tests)

The SqliteAdapter runs `SELECT json_extract('{"a":1}','$.a')` on first use and
throws a typed `StorageError` if JSON1 is unavailable. The storage adapter test
suite asserts the probe succeeds against the in-process `better-sqlite3` driver
and that a driver without JSON1 surfaces a `StorageError` — so a JSON1-less SQLite
build fails CI at the storage workspace rather than silently at runtime.
