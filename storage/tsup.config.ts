import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/web.ts',
    'src/desktop.ts',
    'src/mobile.ts',
    'src/createDatabaseAdapter.web.ts',
    'src/createDatabaseAdapter.native.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  bundle: false,
  external: ['better-sqlite3', 'expo-sqlite', 'idb', '@sublime-ui/desktop', '@sublime-ui/framework'],
});
