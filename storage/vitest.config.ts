import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@sublime-ui/framework': fileURLToPath(new URL('../framework/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['test/**/*.test.{ts,tsx}'],
  },
});
