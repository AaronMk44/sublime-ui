import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeModel } from '../../src/commands/make-model.js';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'mm-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('makeModel', () => {
  it('writes the model file and updates the barrel', async () => {
    const code = await makeModel({ name: 'User', cwd: dir, fields: 'name:string', force: false });
    expect(code).toBe(0);
    const model = readFileSync(join(dir, 'src/models/User.ts'), 'utf8');
    expect(model).toContain('export class User extends Model {');
    expect(model).toContain('declare name: string;');
    expect(model).toContain('registerModel(User);');
    expect(model).toContain('// In-memory by default. For REST: registerModel(User, HttpGateway).');
    const barrel = readFileSync(join(dir, 'src/models/index.ts'), 'utf8');
    expect(barrel).toContain("export * from './User.js';");
  });
  it('uses interactive fields when --fields omitted', async () => {
    const code = await makeModel({ name: 'Tag', cwd: dir, force: false, promptFields: async () => 'label:string' });
    expect(code).toBe(0);
    expect(readFileSync(join(dir, 'src/models/Tag.ts'), 'utf8')).toContain('declare label: string;');
  });
  it('refuses to overwrite without --force', async () => {
    await makeModel({ name: 'User', cwd: dir, fields: 'a:string', force: false });
    const code = await makeModel({ name: 'User', cwd: dir, fields: 'b:string', force: false });
    expect(code).toBe(1);
  });
});
