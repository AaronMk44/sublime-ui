import { describe, it, expect } from 'vitest';
import { parseArgv } from '../src/index.js';

describe('parseArgv', () => {
  it('takes the first positional as the dir/name', () => {
    const r = parseArgv(['my-app']);
    expect(r.dir.endsWith('my-app')).toBe(true);
  });
  it('parses --targets and flags', () => {
    const r = parseArgv(['my-app', '--targets', 'web,desktop', '--no-install', '--yes']);
    expect(r.targets).toEqual(['web', 'desktop']);
    expect(r.install).toBe(false);
    expect(r.yes).toBe(true);
  });
  it('defaults install/git to true', () => {
    const r = parseArgv(['my-app']);
    expect(r.install).toBe(true);
    expect(r.git).toBe(true);
  });
});
