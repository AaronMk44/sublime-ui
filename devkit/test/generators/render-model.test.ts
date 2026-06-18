import { describe, it, expect } from 'vitest';
import { renderModel } from '../../src/lib/generators/render-model.js';

describe('renderModel', () => {
  it('renders a Model with declare fields, resource, and registerModel', () => {
    const out = renderModel({
      className: 'User',
      resource: '/users',
      importAlias: '@sublime-ui',
      fields: [
        { name: 'id', tsType: 'number' },
        { name: 'name', tsType: 'string' },
      ],
    });
    expect(out).toContain("import { Model, registerModel } from '@sublime-ui/framework';");
    expect(out).toContain('export class User extends Model {');
    expect(out).toContain("protected static resource = '/users';");
    expect(out).toContain('declare id: number;');
    expect(out).toContain('declare name: string;');
    expect(out).toContain('registerModel(User);');
  });
  it('always includes an id field even when none provided', () => {
    const out = renderModel({ className: 'Tag', resource: '/tags', importAlias: '@sublime-ui', fields: [] });
    expect(out).toContain('declare id: number;');
  });
});
