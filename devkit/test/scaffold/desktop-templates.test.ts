// devkit/test/scaffold/desktop-templates.test.ts
import { describe, it, expect } from 'vitest';
import {
  renderGreeterService, renderDesktopPackageJson, renderWebpackRules,
  renderRendererIndexHtml, renderRendererIndexTs, renderForgeConfig,
} from '../../src/lib/scaffold/templates/desktop.js';

describe('desktop templates', () => {
  it('greeter service defines + can be registered', () => {
    const src = renderGreeterService();
    expect(src).toContain("from '@sublime-ui/desktop'");
    expect(src).toContain("defineNative('greeter'");
  });
  it('desktop package.json wires forge + electron', () => {
    const pkg = JSON.parse(renderDesktopPackageJson('my-app'));
    expect(pkg.devDependencies['electron']).toBeTruthy();
    expect(pkg.devDependencies['@electron-forge/cli']).toBeTruthy();
    expect(pkg.scripts['start']).toContain('electron-forge');
  });
  it('renderer entry mounts the web app and webpack rules render', () => {
    expect(renderRendererIndexTs()).toContain('main.tsx');
    expect(renderRendererIndexHtml('my-app')).toContain('root');
    expect(renderWebpackRules()).toContain('ts-loader');
    expect(renderForgeConfig()).toContain('WebpackPlugin'); // re-export works
  });
});
