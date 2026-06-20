import type { Configuration } from 'webpack';
import { rules } from './webpack.rules';

// Entry points wire `main_window` and inject `./src/main/preload.ts` as its
// preload, which the Webpack plugin surfaces as MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY.
export const rendererEntryPoints = [
  {
    name: 'main_window',
    html: './src/renderer/index.html',
    js: './src/renderer/index.ts',
    preload: './src/main/preload.ts',
  },
];

export const rendererConfig: Configuration = {
  module: {
    rules,
  },
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
    extensionAlias: {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    },
  },
};
