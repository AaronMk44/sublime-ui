import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.{ts,tsx}'],
    // The e2e suite (test/e2e) hits the real npm registry and is slow, so it is
    // kept out of the default run. It is excluded from the default `test`
    // script (see package.json) and run on demand via `npm run test:e2e`.
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
