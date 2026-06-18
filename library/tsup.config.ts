import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**/*.ts', 'src/**/*.tsx', '!src/**/*.native.tsx', '!src/test-utils/**'],
  format: ['esm'],
  dts: true,
  clean: true,
  bundle: false,
  external: ['react', 'react-native', 'react-native-paper', '@mui/material', '@emotion/react', '@emotion/styled'],
});
