import { describe, it, expect } from 'vitest';
import {
  renderMobileTaskList, renderMobileTaskDetail, renderStorybookNative, renderMobileScreensBarrel,
  renderMobileEntry, renderMobileApp,
} from '../../src/lib/scaffold/templates/mobile.js';

describe('mobile templates', () => {
  it('mobile screens use Paper Text and the model', () => {
    const list = renderMobileTaskList();
    // Screen/Stack from the package root; useNav from the /navigation subpath.
    expect(list).toContain("import { Screen, Stack } from '@sublime-ui/ui';");
    expect(list).toContain("import { useNav } from '@sublime-ui/ui/navigation';");
    expect(list).toContain("from 'react-native-paper'");
    expect(list).toContain('Task.rxAll()');
    const detail = renderMobileTaskDetail();
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
  it('mobile entry registers the app component', () => {
    expect(renderMobileEntry()).toContain('AppRegistry');
    expect(renderMobileApp()).toContain('SublimeProvider');
  });
});
