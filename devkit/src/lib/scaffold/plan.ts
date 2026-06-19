import type { ScaffoldFile, Target } from './types.js';
import {
  renderAppPackageJson, renderSublimeConfig, renderTsconfig, renderGitignore, renderAppReadme,
} from './templates/app.js';
import {
  renderTaskModel, renderModelsBarrel, renderThemeTokensJson, renderThemeTokensTs,
} from './templates/shared.js';
import {
  renderWebTaskList, renderWebTaskDetail, renderStorybookWeb, renderWebScreensBarrel,
  renderWebIndexHtml, renderWebMain, renderViteConfig,
} from './templates/web.js';
import {
  renderMobileTaskList, renderMobileTaskDetail, renderStorybookNative, renderMobileScreensBarrel,
  renderMobileEntry, renderMobileApp,
} from './templates/mobile.js';
import {
  renderGreeterService, renderDesktopPackageJson, renderWebpackRules,
  renderRendererIndexHtml, renderRendererIndexTs,
  renderForgeConfig, renderWebpackMain, renderWebpackRenderer, renderMainTs, renderPreloadTs,
} from './templates/desktop.js';

const has = (t: Target[], x: Target): boolean => t.includes(x);

export function buildScaffoldPlan(opts: { name: string; targets: Target[] }): ScaffoldFile[] {
  const { name, targets } = opts;
  const files: ScaffoldFile[] = [
    { path: 'package.json', contents: renderAppPackageJson(name, targets) },
    { path: 'sublime.config.json', contents: renderSublimeConfig(targets) },
    { path: 'tsconfig.json', contents: renderTsconfig() },
    { path: '.gitignore', contents: renderGitignore() },
    { path: 'README.md', contents: renderAppReadme(name, targets) },
    { path: 'src/models/Task.ts', contents: renderTaskModel() },
    { path: 'src/models/index.ts', contents: renderModelsBarrel() },
    { path: 'src/theme/tokens.json', contents: renderThemeTokensJson() },
    { path: 'src/theme/tokens.ts', contents: renderThemeTokensTs() },
  ];

  if (has(targets, 'web') || has(targets, 'desktop')) {
    files.push(
      { path: 'src/screens/web/TaskList.tsx', contents: renderWebTaskList() },
      { path: 'src/screens/web/TaskDetail.tsx', contents: renderWebTaskDetail() },
      { path: 'src/navigation/screens.ts', contents: renderWebScreensBarrel() },
      { path: 'src/navigation/storybook.web.ts', contents: renderStorybookWeb() },
      { path: 'web/index.html', contents: renderWebIndexHtml(name) },
      { path: 'web/main.tsx', contents: renderWebMain() },
      { path: 'vite.config.ts', contents: renderViteConfig() },
    );
  }

  if (has(targets, 'mobile')) {
    files.push(
      { path: 'src/screens/mobile/TaskList.native.tsx', contents: renderMobileTaskList() },
      { path: 'src/screens/mobile/TaskDetail.native.tsx', contents: renderMobileTaskDetail() },
      { path: 'src/navigation/screens.native.ts', contents: renderMobileScreensBarrel() },
      { path: 'src/navigation/storybook.native.ts', contents: renderStorybookNative() },
      { path: 'mobile/index.js', contents: renderMobileEntry() },
      { path: 'mobile/App.native.tsx', contents: renderMobileApp() },
      { path: 'app.json', contents: JSON.stringify({ name }, null, 2) + '\n' },
    );
  }

  if (has(targets, 'desktop')) {
    files.push(
      { path: 'src/native/greeter.service.ts', contents: renderGreeterService() },
      { path: 'desktop/package.json', contents: renderDesktopPackageJson(name) },
      { path: 'desktop/forge.config.ts', contents: renderForgeConfig() },
      { path: 'desktop/webpack.main.config.ts', contents: renderWebpackMain() },
      { path: 'desktop/webpack.renderer.config.ts', contents: renderWebpackRenderer() },
      { path: 'desktop/webpack.rules.ts', contents: renderWebpackRules() },
      { path: 'desktop/src/main/main.ts', contents: renderMainTs() },
      { path: 'desktop/src/main/preload.ts', contents: renderPreloadTs() },
      { path: 'desktop/src/renderer/index.html', contents: renderRendererIndexHtml(name) },
      { path: 'desktop/src/renderer/index.ts', contents: renderRendererIndexTs() },
    );
  }

  return files;
}
