// devkit/test/scaffold/shared-templates.test.ts
import { describe, it, expect } from 'vitest';
import {
  renderTaskModel, renderModelsBarrel, renderThemeTokensJson, renderThemeTokensTs,
} from '../../src/lib/scaffold/templates/shared.js';

describe('shared templates', () => {
  it('Task model extends Model and registers itself', () => {
    const src = renderTaskModel();
    expect(src).toContain("from '@sublime-ui/framework'");
    expect(src).toContain('export class Task extends Model');
    expect(src).toContain('registerModel(Task)');
    expect(src).toContain("resource = '/tasks'");
  });
  it('models barrel re-exports Task', () => {
    expect(renderModelsBarrel()).toContain("export * from './Task.js'");
  });
  it('theme tokens render valid JSON + a typed wrapper', () => {
    expect(() => JSON.parse(renderThemeTokensJson())).not.toThrow();
    expect(renderThemeTokensTs()).toContain('export const tokens');
  });
});
