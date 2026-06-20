import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/web.ts',
    'src/desktop.ts',
    'src/mobile.ts',
    'src/createDatabaseAdapter.web.ts',
    'src/createDatabaseAdapter.native.ts',
    // With `bundle: false` every internal module that the entries import with a
    // relative `./…js` specifier must itself be an entry, or tsup never emits it
    // and the published dist references files that don't exist. The sqlite/*
    // modules are imported by index/desktop/mobile, so they must ship.
    'src/sqlite/buildSelect.ts',
    'src/sqlite/SqliteAdapter.ts',
    'src/sqlite/SqliteDriver.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  bundle: false,
  external: ['better-sqlite3', 'expo-sqlite', 'idb', '@sublime-ui/desktop', '@sublime-ui/framework'],
});
