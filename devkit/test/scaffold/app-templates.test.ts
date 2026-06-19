// devkit/test/scaffold/app-templates.test.ts
import { describe, it, expect } from 'vitest';
import {
  renderAppPackageJson, renderSublimeConfig, renderTsconfig, renderGitignore, renderAppReadme,
} from '../../src/lib/scaffold/templates/app.js';

describe('app templates', () => {
  it('package.json pins @sublime-ui deps and adds target scripts', () => {
    const pkg = JSON.parse(renderAppPackageJson('my-app', ['web', 'mobile', 'desktop']));
    expect(pkg.name).toBe('my-app');
    expect(pkg.private).toBe(true);
    expect(pkg.dependencies['@sublime-ui/framework']).toMatch(/^\^/);
    expect(pkg.dependencies['@sublime-ui/desktop']).toMatch(/^\^/);
    expect(pkg.scripts['dev:web']).toContain('vite');
    expect(pkg.scripts['build:nav']).toBe('sublime build:nav');
    expect(pkg.scripts['desktop:dev']).toBe('sublime desktop:dev');
  });
  it('package.json omits desktop dep + scripts when desktop not selected', () => {
    const pkg = JSON.parse(renderAppPackageJson('my-app', ['web']));
    expect(pkg.dependencies['@sublime-ui/desktop']).toBeUndefined();
    expect(pkg.scripts['desktop:dev']).toBeUndefined();
    expect(pkg.dependencies['react-native']).toBeUndefined();
  });
  it('sublime.config.json includes a desktop block only with desktop', () => {
    expect(JSON.parse(renderSublimeConfig(['web'])).desktop).toBeUndefined();
    expect(JSON.parse(renderSublimeConfig(['web', 'desktop'])).desktop).toEqual({ dir: 'desktop' });
  });
  it('tsconfig + gitignore + readme render non-empty', () => {
    expect(renderTsconfig()).toContain('"strict": true');
    expect(renderGitignore()).toContain('node_modules');
    expect(renderGitignore()).toContain('navigation.web.tsx'); // generated nav is ignored
    expect(renderAppReadme('my-app', ['web'])).toContain('my-app');
  });
});
