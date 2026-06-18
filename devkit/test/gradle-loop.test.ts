import { describe, it, expect, vi } from 'vitest';
import { runGradleWithHealing } from '../src/lib/gradle.js';

describe('runGradleWithHealing', () => {
  it('installs missing components then succeeds on retry', async () => {
    const installed: string[][] = [];
    let attempt = 0;
    const runner = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) {
        return {
          exitCode: 1,
          output:
            'Failed to install the following SDK components:\n  ndk;27.1.12297006 NDK\n  cmake;3.22.1 CMake',
        };
      }
      return { exitCode: 0, output: 'BUILD SUCCESSFUL' };
    });
    const installer = vi.fn(async (ids: string[]) => {
      installed.push(ids);
    });

    await runGradleWithHealing({
      androidDir: '/proj/android',
      task: 'assembleRelease',
      jdk17Home: '/jdk',
      androidHome: '/sdk',
      runner,
      installer,
    });

    expect(runner).toHaveBeenCalledTimes(2);
    expect(installed).toEqual([['ndk;27.1.12297006', 'cmake;3.22.1']]);
  });

  it('throws when the failure has no installable component', async () => {
    const runner = vi.fn(async () => ({ exitCode: 1, output: 'compilation error: foo' }));
    const installer = vi.fn(async () => {});
    await expect(
      runGradleWithHealing({
        androidDir: '/p', task: 'assembleRelease', jdk17Home: '/j',
        androidHome: '/s', runner, installer,
      }),
    ).rejects.toThrow(/no installable/i);
    expect(installer).not.toHaveBeenCalled();
  });

  it('stops after maxAttempts', async () => {
    const runner = vi.fn(async () => ({
      exitCode: 1,
      output: 'Failed to install: ndk;27.1.12297006',
    }));
    const installer = vi.fn(async () => {});
    await expect(
      runGradleWithHealing({
        androidDir: '/p', task: 'assembleRelease', jdk17Home: '/j',
        androidHome: '/s', runner, installer, maxAttempts: 2,
      }),
    ).rejects.toThrow(/after 2 attempts/i);
    expect(runner).toHaveBeenCalledTimes(2);
  });
});
