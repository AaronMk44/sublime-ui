import { PEER_VERSIONS, SUBLIME_VERSIONS } from '../versions.js';

export {
  renderForgeConfig, renderWebpackMain, renderWebpackRenderer, renderMainTs, renderPreloadTs,
} from '../../desktop/templates.js';

export function renderGreeterService(): string {
  return `import { defineNative } from '@sublime-ui/desktop';

/** A sample native service. Runs in the main process; the renderer calls it via useNative. */
export const greeter = defineNative('greeter', {
  async hello(name: string): Promise<string> {
    return \`Hello from the desktop main process, \${name}!\`;
  },
});
`;
}

export function renderDesktopPackageJson(name: string): string {
  const pkg = {
    name: `${name}-desktop`,
    version: '0.0.0',
    private: true,
    main: '.webpack/main',
    scripts: {
      start: 'electron-forge start',
      package: 'electron-forge package',
      make: 'electron-forge make',
    },
    devDependencies: {
      '@electron-forge/cli': '^7.5.0',
      '@electron-forge/maker-deb': '^7.5.0',
      '@electron-forge/maker-rpm': '^7.5.0',
      '@electron-forge/maker-squirrel': '^7.5.0',
      '@electron-forge/maker-zip': '^7.5.0',
      '@electron-forge/plugin-auto-unpack-natives': '^7.5.0',
      '@electron-forge/plugin-fuses': '^7.5.0',
      '@electron-forge/plugin-webpack': '^7.5.0',
      '@electron/fuses': '^1.8.0',
      '@vercel/webpack-asset-relocator-loader': '^1.7.3',
      'css-loader': '^7.1.2',
      electron: PEER_VERSIONS['electron']!,
      'node-loader': '^2.0.0',
      'style-loader': '^4.0.0',
      'ts-loader': '^9.5.1',
      typescript: PEER_VERSIONS['typescript']!,
    },
    dependencies: {
      '@sublime-ui/desktop': SUBLIME_VERSIONS.desktop,
    },
  };
  return JSON.stringify(pkg, null, 2) + '\n';
}

export function renderWebpackRules(): string {
  return `import type { ModuleOptions } from 'webpack';

type Rules = Required<ModuleOptions>['rules'];

// TypeScript + CSS — safe for every target (main, renderer, preload).
const tsAndCss: Rules = [
  {
    test: /\\.tsx?$/,
    exclude: /(node_modules|\\.webpack)/,
    use: { loader: 'ts-loader', options: { transpileOnly: true } },
  },
  { test: /\\.css$/, use: ['style-loader', 'css-loader'] },
];

// Full rule set for the MAIN process. The asset-relocator-loader injects a
// runtime \`__dirname\` reference (for native-module relocation); that is undefined
// in the sandboxed renderer/preload and crashes them, so it must NOT run there.
export const rules: Rules = [
  { test: /native_modules[/\\\\].+\\.node$/, use: 'node-loader' },
  {
    test: /[/\\\\]node_modules[/\\\\].+\\.(m?js|node)$/,
    parser: { amd: false },
    use: {
      loader: '@vercel/webpack-asset-relocator-loader',
      options: { outputAssetBase: 'native_modules' },
    },
  },
  ...tsAndCss,
];

// Renderer/preload run sandboxed (no Node) — TypeScript + CSS only.
export const rendererRules: Rules = tsAndCss;
`;
}

export function renderRendererIndexHtml(name: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${name}</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;
}

export function renderRendererIndexTs(): string {
  // The desktop renderer mounts the same web entry as the web target.
  return `import '../../../web/main.tsx';
`;
}
