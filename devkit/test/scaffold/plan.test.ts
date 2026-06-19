import { describe, it, expect } from 'vitest';
import { buildScaffoldPlan } from '../../src/lib/scaffold/plan.js';

const paths = (targets: Parameters<typeof buildScaffoldPlan>[0]['targets']) =>
  buildScaffoldPlan({ name: 'my-app', targets }).map((f) => f.path).sort();

describe('buildScaffoldPlan', () => {
  it('always emits the shared core + app files', () => {
    const p = paths(['web']);
    expect(p).toContain('package.json');
    expect(p).toContain('sublime.config.json');
    expect(p).toContain('tsconfig.json');
    expect(p).toContain('src/models/Task.ts');
    expect(p).toContain('src/theme/tokens.json');
    expect(p).toContain('src/theme/tokens.ts');
  });
  it('web target adds web screens, storybook.web, and the web entry', () => {
    const p = paths(['web']);
    expect(p).toContain('src/screens/web/TaskList.tsx');
    expect(p).toContain('src/screens/web/TaskDetail.tsx');
    expect(p).toContain('src/navigation/screens.ts');
    expect(p).toContain('src/navigation/storybook.web.ts');
    expect(p).toContain('web/main.tsx');
    expect(p).toContain('vite.config.ts');
    expect(p).not.toContain('src/screens/mobile/TaskList.native.tsx');
  });
  it('mobile target adds native screens, storybook.native, app.json, and the RN entry', () => {
    const p = paths(['mobile']);
    expect(p).toContain('src/screens/mobile/TaskList.native.tsx');
    expect(p).toContain('src/navigation/screens.native.ts');
    expect(p).toContain('src/navigation/storybook.native.ts');
    expect(p).toContain('mobile/App.native.tsx');
    expect(p).toContain('app.json');
  });
  it('desktop target adds the greeter service + desktop shell + reuses web', () => {
    const p = paths(['web', 'desktop']);
    expect(p).toContain('src/native/greeter.service.ts');
    expect(p).toContain('desktop/forge.config.ts');
    expect(p).toContain('desktop/src/main/main.ts');
    expect(p).toContain('desktop/src/renderer/index.ts');
    expect(p).toContain('web/main.tsx'); // desktop renders the web UI
  });
  it('produces no duplicate paths for the all-three combo', () => {
    const all = buildScaffoldPlan({ name: 'my-app', targets: ['web', 'mobile', 'desktop'] });
    const seen = new Set(all.map((f) => f.path));
    expect(seen.size).toBe(all.length);
  });
});
