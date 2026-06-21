import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hasJava, findJavaHomeRoot, ensureManagedJdk17 } from '../src/lib/jdk.js';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jdk-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

function makeJava(home: string): void {
  mkdirSync(join(home, 'bin'), { recursive: true });
  writeFileSync(join(home, 'bin', 'java'), '');
}

describe('findJavaHomeRoot', () => {
  it('finds a Linux/Windows-style <ver>/bin/java layout', () => {
    const ver = join(dir, 'jdk-17.0.13+11');
    makeJava(ver);
    expect(findJavaHomeRoot(dir)).toBe(ver);
  });
  it('finds a macOS <ver>/Contents/Home/bin/java layout', () => {
    const home = join(dir, 'jdk-17.0.13+11', 'Contents', 'Home');
    makeJava(home);
    expect(findJavaHomeRoot(dir)).toBe(home);
  });
  it('returns null when no java is present', () => {
    mkdirSync(join(dir, 'jdk-17.0.13+11'), { recursive: true });
    expect(findJavaHomeRoot(dir)).toBeNull();
  });
});

describe('ensureManagedJdk17', () => {
  it('short-circuits when the managed JDK already exists', async () => {
    makeJava(join(dir, 'jdk-17'));
    const download = vi.fn();
    const extract = vi.fn();
    const root = await ensureManagedJdk17({ workDir: dir, deps: { download, extract } });
    expect(root).toBe(join(dir, 'jdk-17'));
    expect(download).not.toHaveBeenCalled();
    expect(extract).not.toHaveBeenCalled();
  });

  it('downloads, extracts, and normalizes into <workDir>/jdk-17', async () => {
    const download = vi.fn(async () => {});
    // Simulate extraction producing a versioned top-level dir with bin/java.
    const extract = vi.fn(async (_archive: string, dest: string) => {
      makeJava(join(dest, 'jdk-17.0.13+11'));
    });
    const root = await ensureManagedJdk17({ workDir: dir, deps: { download, extract } });
    expect(root).toBe(join(dir, 'jdk-17'));
    expect(hasJava(root)).toBe(true);
    expect(download).toHaveBeenCalledOnce();
    expect(extract).toHaveBeenCalledOnce();
  });
});
