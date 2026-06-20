// devkit/src/lib/scaffold/templates/app.ts
import type { Target } from '../types.js';
import { SUBLIME_VERSIONS, PEER_VERSIONS } from '../versions.js';

const has = (targets: Target[], t: Target): boolean => targets.includes(t);

export function renderAppPackageJson(name: string, targets: Target[]): string {
  const deps: Record<string, string> = {
    '@sublime-ui/framework': SUBLIME_VERSIONS.framework,
    '@sublime-ui/library': SUBLIME_VERSIONS.library,
    '@sublime-ui/ui': SUBLIME_VERSIONS.ui,
    react: PEER_VERSIONS['react']!,
    'react-redux': PEER_VERSIONS['react-redux']!,
  };
  const devDeps: Record<string, string> = {
    '@sublime-ui/devkit': SUBLIME_VERSIONS.framework, // shares the lockstep version
    typescript: PEER_VERSIONS['typescript']!,
    '@types/react': '^18.3.12',
    '@types/node': '^22.0.0',
  };
  const scripts: Record<string, string> = { 'build:nav': 'sublime build:nav' };

  if (has(targets, 'web') || has(targets, 'desktop')) {
    deps['react-dom'] = PEER_VERSIONS['react-dom']!;
    deps['react-router-dom'] = PEER_VERSIONS['react-router-dom']!;
    deps['@mui/material'] = PEER_VERSIONS['@mui/material']!;
    deps['@emotion/react'] = PEER_VERSIONS['@emotion/react']!;
    deps['@emotion/styled'] = PEER_VERSIONS['@emotion/styled']!;
    devDeps['@types/react-dom'] = '^18.3.1';
    devDeps['vite'] = PEER_VERSIONS['vite']!;
    devDeps['@vitejs/plugin-react'] = PEER_VERSIONS['@vitejs/plugin-react']!;
    scripts['dev:web'] = 'vite';
    scripts['build:web'] = 'vite build';
  }
  if (has(targets, 'mobile')) {
    // `sublime build` runs `expo prebuild`; pin expo to the RN-compatible SDK so
    // `npx expo` uses the project's version instead of auto-installing latest.
    deps['expo'] = PEER_VERSIONS['expo'] ?? '~52.0.0';
    deps['react-native'] = PEER_VERSIONS['react-native']!;
    deps['react-native-paper'] = PEER_VERSIONS['react-native-paper']!;
    deps['react-native-safe-area-context'] = PEER_VERSIONS['react-native-safe-area-context']!;
    deps['@react-navigation/native'] = PEER_VERSIONS['@react-navigation/native']!;
    deps['@react-navigation/native-stack'] = PEER_VERSIONS['@react-navigation/native-stack']!;
    deps['@react-navigation/bottom-tabs'] = PEER_VERSIONS['@react-navigation/bottom-tabs']!;
    scripts['dev:mobile'] = 'sublime build --debug';
    scripts['build:mobile'] = 'sublime build';
  }
  if (has(targets, 'desktop')) {
    deps['@sublime-ui/desktop'] = SUBLIME_VERSIONS.desktop;
    devDeps['electron'] = PEER_VERSIONS['electron']!;
    scripts['dev:desktop'] = 'sublime desktop:dev';
    scripts['build:desktop'] = 'sublime desktop:build';
  }

  const pkg: Record<string, unknown> = {
    name,
    version: '0.0.0',
    private: true,
    type: 'module',
  };
  // Expo defaults its entry to `expo/AppEntry.js`, which imports the project's
  // `./App` — but this scaffold's entry lives at `mobile/index.js`. Point
  // Expo's `main` at it so the mobile target actually mounts the app.
  if (has(targets, 'mobile')) pkg['main'] = 'mobile/index.js';
  pkg['scripts'] = scripts;
  pkg['dependencies'] = deps;
  pkg['devDependencies'] = devDeps;
  return JSON.stringify(pkg, null, 2) + '\n';
}

export function renderSublimeConfig(targets: Target[]): string {
  const cfg: Record<string, unknown> = {
    modelsDir: 'src/models',
    componentsDir: 'src/components',
    themeDir: 'src/theme',
    navigationDir: 'src/navigation',
    importAlias: '@sublime-ui',
  };
  if (has(targets, 'desktop')) cfg['desktop'] = { dir: 'desktop' };
  return JSON.stringify(cfg, null, 2) + '\n';
}

export function renderTsconfig(targets: Target[] = ['web', 'mobile', 'desktop']): string {
  const wantsWeb = has(targets, 'web') || has(targets, 'desktop');

  // Pin `types` so ambient globals from uninstalled peers (e.g. react-native or
  // electron type packages) don't bleed in; only pull `react-dom` when a web/
  // desktop target actually ships it.
  const types = ['react', 'node'];
  if (wantsWeb) types.splice(1, 0, 'react-dom');

  // Typecheck only the app's own source. The Electron Forge build configs
  // (forge.config.ts, webpack.*.ts) live at the desktop root, are owned by the
  // desktop sub-package's toolchain, and pull deps not installed at the app
  // root — so we include `desktop/src` (main/preload/renderer) and skip them.
  const include = ['src'];
  if (wantsWeb) include.push('web');
  if (has(targets, 'mobile')) include.push('mobile');
  if (has(targets, 'desktop')) include.push('desktop/src');

  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        jsx: 'react-jsx',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        noUncheckedIndexedAccess: true,
        resolveJsonModule: true,
        types,
      },
      include,
    },
    null,
    2,
  ) + '\n';
}

export function renderGitignore(): string {
  return [
    'node_modules',
    'dist',
    'build',
    '.DS_Store',
    '',
    '# Generated by `sublime build:nav`',
    'src/navigation/navigation.tsx',
    'src/navigation/navigation.native.tsx',
    'src/navigation/routes.d.ts',
    'src/navigation/index.ts',
    '',
    '# Native build output',
    'android',
    'ios',
    '',
    '# Desktop (Electron Forge) intermediate output (consolidated into dist/desktop)',
    'desktop/out',
    'desktop/.webpack',
    '',
  ].join('\n');
}

export function renderAppReadme(name: string, targets: Target[]): string {
  const lines = [
    `# ${name}`,
    '',
    'A [Sublime UI](https://sublime-ui.github.io/sublime-ui/) app — write the',
    'non-UI parts once, run on mobile, web, and desktop.',
    '',
    '## Getting started',
    '',
    '```bash',
    'npm install',
    'npm run build:nav   # compile navigation',
  ];
  if (has(targets, 'web')) lines.push('npm run dev:web     # web (Vite)');
  if (has(targets, 'mobile')) lines.push('npm run dev:mobile  # Android (debug)');
  if (has(targets, 'desktop')) lines.push('npm run dev:desktop  # Electron');
  lines.push('```', '');
  return lines.join('\n');
}
