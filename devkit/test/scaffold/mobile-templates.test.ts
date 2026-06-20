import { describe, it, expect } from 'vitest';
import {
  renderMobileTaskList, renderMobileTaskDetail, renderStorybookNative, renderMobileScreensBarrel,
  renderMobileEntry, renderMobileApp, renderMetroConfig,
} from '../../src/lib/scaffold/templates/mobile.js';

describe('mobile templates', () => {
  it('mobile screens use the design system and the model', () => {
    const list = renderMobileTaskList();
    // Screen/Stack from the package root; useNav from the /navigation subpath.
    expect(list).toContain("import { Screen, Stack } from '@sublime-ui/ui';");
    expect(list).toContain("import { useNav } from '@sublime-ui/ui/navigation';");
    // Sample screens showcase the design system (Text/Card), not raw Paper.
    expect(list).toContain("from '@sublime-ui/library'");
    expect(list).not.toContain("from 'react-native-paper'");
    expect(list).toContain('Task.rxAll()');
    const detail = renderMobileTaskDetail();
    expect(detail).toContain("from '@sublime-ui/library'");
    expect(detail).toContain("import type { AppRoutes } from '../../navigation'");
    expect(detail).toContain('useNav<AppRoutes>()');
    expect(detail).toContain("nav.params<'task'>()");
  });
  it('storybook.native uses a mobile format', () => {
    const src = renderStorybookNative();
    expect(src).toContain("format: 'bottomNav'");
    expect(src).toContain("from '@sublime-ui/ui/navigation'");
  });
  it('native screens barrel re-exports TaskList and TaskDetail from mobile screens', () => {
    const src = renderMobileScreensBarrel();
    expect(src).toContain("export { TaskList } from '../screens/mobile/TaskList.native'");
    expect(src).toContain("export { TaskDetail } from '../screens/mobile/TaskDetail.native'");
  });
  it('mobile entry wires Expo via registerRootComponent', () => {
    const entry = renderMobileEntry();
    // Expo's helper sets up the root component so the mobile target boots from
    // the project entry instead of expo/AppEntry.js.
    expect(entry).toContain("import { registerRootComponent } from 'expo';");
    expect(entry).toContain("import { App } from './App.native';");
    expect(entry).toContain('registerRootComponent(App);');
    expect(entry).not.toContain('AppRegistry');
  });
  it('mobile App wraps the tree in the Redux Provider + SublimeProvider', () => {
    const app = renderMobileApp();
    expect(app).toContain('SublimeProvider');
    // Model.rxAll/rxFind need a Redux <Provider store={store}>.
    expect(app).toContain("import { Provider } from 'react-redux';");
    expect(app).toContain("import { store } from '@sublime-ui/framework';");
    expect(app).toContain('<Provider store={store}>');
  });
  it('metro config enables package exports for @sublime-ui/* resolution', () => {
    const cfg = renderMetroConfig();
    expect(cfg).toContain("const { getDefaultConfig } = require('expo/metro-config');");
    expect(cfg).toContain('config.resolver.unstable_enablePackageExports = true;');
    expect(cfg).toContain('module.exports = config;');
  });
});
