import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Web tests run in jsdom and must never load real react-native source (Flow
// syntax vitest cannot transform). Native authoring/layout primitives pull in
// react-native, so we alias react-native to a minimal stub for the test run
// only.
const reactNativeStub = fileURLToPath(new URL('./test/stubs/react-native.ts', import.meta.url));
const rnDeepStub = fileURLToPath(new URL('./test/stubs/rn-deep.ts', import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      // Deep RN subpath imports reached via navigation / safe-area.
      { find: /^react-native\/.*/, replacement: rnDeepStub },
      { find: /^react-native$/, replacement: reactNativeStub },
    ],
    // Do NOT honour the `react-native` package.json field/condition in tests —
    // it points packages at their uncompiled `src` (Flow/TS source). Use the
    // plain module/main builds instead.
    mainFields: ['module', 'main'],
    conditions: ['import', 'module', 'node', 'default'],
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['test/**/*.test.{ts,tsx}'],
    server: { deps: { inline: ['react-native-safe-area-context'] } },
  },
});
