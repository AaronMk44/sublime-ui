/**
 * Pure string renderers for the scaffolded `desktop/` directory of a Sublime app.
 *
 * These emit the Gulani-style Electron Forge setup wired to `@sublime-ui/desktop`:
 * `forge.config.ts` (Squirrel/ZIP/Deb/Rpm makers, AutoUnpackNatives, Fuses, the
 * Webpack plugin), the two Webpack configs, and the `main.ts` / `preload.ts`
 * entries that call {@link startDesktop} and `exposeNativeBridge` respectively.
 *
 * They are pure functions returning the exact file contents, so they can be
 * unit-tested in isolation and later driven by the `make:desktop` generator. In
 * dev the renderer loads from the Webpack dev-server URL; a packaged build loads
 * from `file://` inside the asar — the shell derives this from the Webpack
 * plugin's injected `MAIN_WINDOW_WEBPACK_ENTRY` /
 * `MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY` constants.
 */

/** Renders `desktop/forge.config.ts`. */
export function renderForgeConfig(): string {
  return `import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new WebpackPlugin({
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            name: 'main_window',
            html: './src/renderer/index.html',
            js: './src/renderer/index.ts',
            preload: {
              js: './src/main/preload.ts',
            },
          },
        ],
      },
    }),
    // Harden the packaged app at make time.
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
`;
}

/** Renders `desktop/webpack.main.config.ts`. */
export function renderWebpackMain(): string {
  return `import type { Configuration } from 'webpack';
import { rules } from './webpack.rules';

export const mainConfig: Configuration = {
  entry: './src/main/main.ts',
  module: {
    rules,
  },
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
    extensionAlias: {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    },
  },
};
`;
}

/** Renders `desktop/webpack.renderer.config.ts`. */
export function renderWebpackRenderer(): string {
  return `import type { Configuration } from 'webpack';
import { rendererRules } from './webpack.rules';

// Entry points wire \`main_window\` and inject \`./src/main/preload.ts\` as its
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
    rules: rendererRules,
  },
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
    // The generated navigation barrel imports with explicit \`.js\` specifiers
    // (ESM style); map them to the real \`.ts\`/\`.tsx\` sources so webpack resolves
    // them the way Vite/Metro do.
    extensionAlias: {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    },
  },
};
`;
}

/** Renders `desktop/src/main/main.ts`. */
export function renderMainTs(): string {
  return `import { app, ipcMain } from 'electron';
import { startDesktop } from '@sublime-ui/desktop';

// These constants are injected by the Electron Forge Webpack plugin.
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

startDesktop({
  app,
  ipcMain,
  entry: MAIN_WINDOW_WEBPACK_ENTRY,
  preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
  isDev: !app.isPackaged,
});
`;
}

/** Renders `desktop/src/main/preload.ts`. */
export function renderPreloadTs(): string {
  return `import { contextBridge, ipcRenderer } from 'electron';
import { exposeNativeBridge } from '@sublime-ui/desktop/preload';

// Exposes exactly one function (\`window.sublimeNative.invoke\`) over the single
// \`native:invoke\` channel — nothing else crosses the isolation boundary.
exposeNativeBridge(contextBridge, ipcRenderer);
`;
}
