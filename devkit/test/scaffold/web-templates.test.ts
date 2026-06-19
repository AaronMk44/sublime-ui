import { describe, it, expect } from 'vitest';
import {
  renderWebTaskList, renderWebTaskDetail, renderStorybookWeb, renderWebScreensBarrel,
  renderWebIndexHtml, renderWebMain, renderViteConfig,
} from '../../src/lib/scaffold/templates/web.js';

describe('web templates', () => {
  it('TaskList reads the model reactively and links to detail', () => {
    const src = renderWebTaskList();
    expect(src).toContain("from '@sublime-ui/ui'");
    expect(src).toContain('Task.rxAll()');
    expect(src).toContain('useNav()');
  });
  it('TaskDetail reads a typed id param', () => {
    expect(renderWebTaskDetail()).toContain("params<{ id: number }>()");
  });
  it('storybook.web uses a web format and 2 pages', () => {
    const src = renderStorybookWeb();
    expect(src).toContain("from '@sublime-ui/ui/navigation'");
    expect(src).toContain("format: 'sidebar'");
    expect(src).toContain('page<{ id: number }>');
  });
  it('screens barrel re-exports TaskList and TaskDetail from web screens', () => {
    const src = renderWebScreensBarrel();
    expect(src).toContain("export { TaskList } from '../screens/web/TaskList'");
    expect(src).toContain("export { TaskDetail } from '../screens/web/TaskDetail'");
  });
  it('web entry mounts the provider + generated Navigation', () => {
    expect(renderWebMain()).toContain('SublimeProvider');
    expect(renderWebMain()).toContain('Navigation');
    expect(renderWebIndexHtml('my-app')).toContain('my-app');
    expect(renderViteConfig()).toContain('@vitejs/plugin-react');
  });
});
