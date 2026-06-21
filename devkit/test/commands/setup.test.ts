import { describe, it, expect } from 'vitest';
import { SETUP_COMPONENTS, setupCommand } from '../../src/commands/setup.js';

describe('SETUP_COMPONENTS', () => {
  it('lists the full pinned toolchain', () => {
    expect(SETUP_COMPONENTS).toEqual([
      'platform-tools',
      'platforms;android-35',
      'build-tools;35.0.0',
      'ndk;27.1.12297006',
      'cmake;3.22.1',
    ]);
  });
});

describe('setupCommand orchestration', () => {
  it('runs phases in order and returns 0 when the env verifies', async () => {
    const order: string[] = [];
    const code = await setupCommand({
      ensureJdk: async () => { order.push('jdk'); return '/jdk'; },
      ensureSdk: async () => { order.push('sdk'); return '/sdk'; },
      acceptLicenses: async () => { order.push('licenses'); return 0; },
      installComponents: async (_root, ids) => { order.push(`install:${ids.length}`); },
      report: () => ({ ok: true, rows: [] }),
    });
    expect(order).toEqual(['jdk', 'sdk', 'licenses', 'install:5']);
    expect(code).toBe(0);
  });

  it('returns 1 when verification fails', async () => {
    const code = await setupCommand({
      ensureJdk: async () => '/jdk',
      ensureSdk: async () => '/sdk',
      acceptLicenses: async () => 0,
      installComponents: async () => {},
      report: () => ({ ok: false, rows: [] }),
    });
    expect(code).toBe(1);
  });

  it('propagates an installer failure as a non-zero exit', async () => {
    const code = await setupCommand({
      ensureJdk: async () => '/jdk',
      ensureSdk: async () => '/sdk',
      acceptLicenses: async () => 0,
      installComponents: async () => { throw new Error('network'); },
      report: () => ({ ok: true, rows: [] }),
    }).catch(() => 1);
    expect(code).toBe(1);
  });
});
