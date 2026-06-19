import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**/*.ts', 'src/**/*.tsx'],
  format: ['esm'],
  dts: true,
  clean: true,
  bundle: false,
  external: ['electron', 'react', 'react-dom'],
});
