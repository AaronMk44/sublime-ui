import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**/*.ts', 'src/**/*.tsx', '!src/**/*.native.tsx', '!src/test-utils/**'],
  format: ['esm'],
  dts: true,
  clean: true,
  bundle: false,
  external: [
    'react', 'react-native', 'react-router-dom',
    '@react-navigation/native', '@react-navigation/native-stack',
    '@react-navigation/bottom-tabs', '@react-navigation/drawer',
    'react-native-safe-area-context',
  ],
});
