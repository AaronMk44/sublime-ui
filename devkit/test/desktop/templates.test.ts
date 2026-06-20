import { describe, it, expect } from 'vitest';
import {
  renderForgeConfig,
  renderWebpackMain,
  renderWebpackRenderer,
  renderMainTs,
  renderPreloadTs,
} from '../../src/lib/desktop/templates.js';

describe('desktop templates', () => {
  describe('renderForgeConfig', () => {
    const out = renderForgeConfig();

    it('wires the Squirrel maker', () => {
      expect(out).toContain('MakerSquirrel');
    });

    it('wires the cross-platform makers', () => {
      expect(out).toContain('MakerZIP');
      expect(out).toContain('MakerDeb');
      expect(out).toContain('MakerRpm');
    });

    it('unpacks native node modules from the asar', () => {
      expect(out).toContain('AutoUnpackNativesPlugin');
    });

    it('hardens the package with Fuses', () => {
      expect(out).toContain('FusesPlugin');
      expect(out).toContain('OnlyLoadAppFromAsar');
      expect(out).toContain('RunAsNode');
    });

    it('runs the renderer through the Webpack plugin', () => {
      expect(out).toContain('WebpackPlugin');
      expect(out).toContain("name: 'main_window'");
    });
  });

  describe('renderWebpackMain', () => {
    const out = renderWebpackMain();

    it('builds the main entry', () => {
      expect(out).toContain("entry: './src/main/main.ts'");
    });

    it('maps .js specifiers to .ts/.tsx so generated imports resolve', () => {
      expect(out).toContain('extensionAlias');
    });
  });

  describe('renderWebpackRenderer', () => {
    const out = renderWebpackRenderer();

    it('injects the preload entry point', () => {
      expect(out).toContain("name: 'main_window'");
      expect(out).toContain("preload:");
      expect(out).toContain('./src/main/preload.ts');
    });

    it('maps .js specifiers to .ts/.tsx so the generated nav barrel resolves', () => {
      // The generated `./navigation.js` import only resolves with this alias.
      expect(out).toContain('extensionAlias');
    });
  });

  describe('renderMainTs', () => {
    const out = renderMainTs();

    it('imports startDesktop from @sublime-ui/desktop', () => {
      expect(out).toContain('startDesktop');
      expect(out).toContain("from '@sublime-ui/desktop'");
    });

    it('reads the Webpack-injected entry constants', () => {
      expect(out).toContain('MAIN_WINDOW_WEBPACK_ENTRY');
      expect(out).toContain('MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY');
    });
  });

  describe('renderPreloadTs', () => {
    const out = renderPreloadTs();

    it('exposes the bridge via exposeNativeBridge', () => {
      expect(out).toContain('exposeNativeBridge');
      expect(out).toContain("from '@sublime-ui/desktop/preload'");
      expect(out).toContain('contextBridge');
      expect(out).toContain('ipcRenderer');
    });
  });
});
