import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@sublime-ui/framework': fileURLToPath(new URL('../framework/src/index.ts', import.meta.url)),
      // I2: resolve getNative (a VALUE) to the desktop package's CURRENT source
      // (I1's get-native.ts), not its possibly-stale built dist. The type-only
      // '@sublime-ui/desktop/sqlite-contract' import is erased at transpile, so it
      // needs no runtime alias.
      '@sublime-ui/desktop/client': fileURLToPath(
        new URL('../desktop/src/client.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['test/**/*.test.{ts,tsx}'],
  },
});
