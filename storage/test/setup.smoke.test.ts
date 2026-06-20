import { describe, it, expect } from 'vitest';

// Trivial smoke test — proves the @sublime-ui/storage workspace + vitest are wired.
// Intentionally does NOT import better-sqlite3 (a native module): this test must pass
// even if the native install/build fails. Driver-level coverage arrives in H3/H4.
describe('@sublime-ui/storage test environment', () => {
  it('runs in node (no DOM document by default)', () => {
    expect(typeof process).toBe('object');
    expect(process.versions.node).toBeTruthy();
    expect(typeof document).toBe('undefined');
  });

  it('has the @sublime-ui/framework alias resolvable from source', async () => {
    const framework = await import('@sublime-ui/framework');
    expect(framework).toBeTypeOf('object');
  });
});
