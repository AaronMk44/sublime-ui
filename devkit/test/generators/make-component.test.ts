import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeComponent } from '../../src/commands/make-component.js';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'mc-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('makeComponent', () => {
  it('writes the four-file quartet and updates the barrel', async () => {
    const code = await makeComponent({ name: 'Card', cwd: dir, mobileOnly: false, force: false });
    expect(code).toBe(0);
    const base = join(dir, 'src/components/Card');
    expect(existsSync(join(base, 'Card.types.ts'))).toBe(true);
    expect(existsSync(join(base, 'Card.tsx'))).toBe(true);
    expect(existsSync(join(base, 'Card.native.tsx'))).toBe(true);
    expect(existsSync(join(base, 'index.ts'))).toBe(true);
    expect(readFileSync(join(dir, 'src/components/index.ts'), 'utf8')).toContain("export * from './Card/index.js';");
  });
  it('mobile-only writes a web stub', async () => {
    await makeComponent({ name: 'Drawer', cwd: dir, mobileOnly: true, force: false });
    expect(readFileSync(join(dir, 'src/components/Drawer/Drawer.tsx'), 'utf8')).toContain('mobile-only');
  });
});
