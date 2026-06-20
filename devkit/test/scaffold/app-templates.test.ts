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
    // react-redux ships on every target — Model.rxAll/rxFind use useSelector.
    expect(pkg.dependencies['react-redux']).toMatch(/^\^/);
    expect(pkg.scripts['dev:web']).toContain('vite');
    expect(pkg.scripts['build:nav']).toBe('sublime build:nav');
    expect(pkg.scripts['dev:desktop']).toBe('sublime desktop:dev');
    expect(pkg.scripts['build:desktop']).toBe('sublime desktop:build');
  });
  it('package.json points Expo main at the mobile entry only with mobile', () => {
    const withMobile = JSON.parse(renderAppPackageJson('my-app', ['web', 'mobile']));
    expect(withMobile.main).toBe('mobile/index.js');
    const webOnly = JSON.parse(renderAppPackageJson('my-app', ['web']));
    expect(webOnly.main).toBeUndefined();
  });
  it('package.json omits desktop dep + scripts when desktop not selected', () => {
    const pkg = JSON.parse(renderAppPackageJson('my-app', ['web']));
    expect(pkg.dependencies['@sublime-ui/desktop']).toBeUndefined();
    expect(pkg.scripts['dev:desktop']).toBeUndefined();
    expect(pkg.dependencies['react-native']).toBeUndefined();
    // react-redux is still present (base dep) even for a web-only app.
    expect(pkg.dependencies['react-redux']).toMatch(/^\^/);
  });
  it('sublime.config.json includes a desktop block only with desktop', () => {
    expect(JSON.parse(renderSublimeConfig(['web'])).desktop).toBeUndefined();
    expect(JSON.parse(renderSublimeConfig(['web', 'desktop'])).desktop).toEqual({ dir: 'desktop' });
  });
  it('tsconfig + gitignore + readme render non-empty', () => {
    expect(renderTsconfig()).toContain('"strict": true');
    expect(renderGitignore()).toContain('node_modules');
    expect(renderGitignore()).toContain('navigation.tsx'); // generated nav is ignored
    expect(renderAppReadme('my-app', ['web'])).toContain('my-app');
  });
  it('tsconfig adapts types + include to the selected targets', () => {
    const all = JSON.parse(renderTsconfig(['web', 'mobile', 'desktop']));
    expect(all.compilerOptions.resolveJsonModule).toBe(true);
    expect(all.compilerOptions.types).toEqual(['react', 'react-dom', 'node']);
    // The desktop build configs (forge/webpack) at the desktop root are excluded;
    // only the app's desktop source is typechecked.
    expect(all.include).toContain('desktop/src');
    expect(all.include).not.toContain('desktop');

    const mobileOnly = JSON.parse(renderTsconfig(['mobile']));
    expect(mobileOnly.compilerOptions.types).toEqual(['react', 'node']); // no react-dom
    expect(mobileOnly.include).toEqual(['src', 'mobile']);
  });
});
