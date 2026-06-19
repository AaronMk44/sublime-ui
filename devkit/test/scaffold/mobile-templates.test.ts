import { describe, it, expect } from 'vitest';
import {
  renderMobileTaskList, renderMobileTaskDetail, renderStorybookNative, renderMobileScreensBarrel,
  renderMobileEntry, renderMobileApp,
} from '../../src/lib/scaffold/templates/mobile.js';

describe('mobile templates', () => {
  it('mobile screens use Paper Text and the model', () => {
    expect(renderMobileTaskList()).toContain("from 'react-native-paper'");
    expect(renderMobileTaskList()).toContain('Task.rxAll()');
    expect(renderMobileTaskDetail()).toContain("params<{ id: number }>()");
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
