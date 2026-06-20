import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { REQUIREMENTS } from '../src/lib/requirements.js';

// Mock the filesystem + process runner so gatherProbes is deterministic.
const existsSyncMock = vi.fn<(p: string) => boolean>();
vi.mock('node:fs', () => ({ existsSync: (p: string) => existsSyncMock(p) }));

const runMock = vi.fn();
vi.mock('../src/util/exec.js', () => ({ run: (...a: unknown[]) => runMock(...a) }));

import {
  resolveAndroidHome,
  sdkmanagerPath,
  legacySdkmanagerPath,
  gatherProbes,
} from '../src/lib/probe.js';

describe('resolveAndroidHome', () => {
  it('prefers ANDROID_HOME', () => {
    expect(resolveAndroidHome({ ANDROID_HOME: '/a', ANDROID_SDK_ROOT: '/b' })).toBe('/a');
  });
  it('falls back to ANDROID_SDK_ROOT', () => {
    expect(resolveAndroidHome({ ANDROID_SDK_ROOT: '/b' })).toBe('/b');
  });
  it('returns null when neither is set', () => {
    expect(resolveAndroidHome({})).toBeNull();
  });
});

describe('sdkmanagerPath', () => {
  it('builds the cmdline-tools path', () => {
    const p = sdkmanagerPath('/sdk');
    expect(p).toContain('cmdline-tools');
    expect(p).toContain('sdkmanager');
  });
});

describe('legacySdkmanagerPath', () => {
  it('builds the legacy tools/bin path', () => {
    const p = legacySdkmanagerPath('/sdk');
    expect(p).toContain(join('tools', 'bin'));
    expect(p).toContain('sdkmanager');
  });
});

describe('gatherProbes (filesystem detection)', () => {
  const ANDROID = join('C:', 'Sdk');
  const ndkProps = join(ANDROID, 'ndk', REQUIREMENTS.ndk, 'source.properties');
  const cmakeDir = join(ANDROID, 'cmake', REQUIREMENTS.cmake);
  const modernSm = sdkmanagerPath(ANDROID);
  const legacySm = legacySdkmanagerPath(ANDROID);
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    existsSyncMock.mockReset();
    runMock.mockReset();
    // node -v, java -version, adb --version
    runMock.mockImplementation((file: string) => {
      if (file === process.execPath) return Promise.resolve({ stdout: 'v20.0.0', stderr: '', exitCode: 0 });
      if (file === 'java') return Promise.resolve({ stdout: '', stderr: 'openjdk version "17.0.13"', exitCode: 0 });
      if (file === 'adb') return Promise.resolve({ stdout: 'Android Debug Bridge version 1.0.41', stderr: '', exitCode: 0 });
      return Promise.resolve({ stdout: '', stderr: '', exitCode: 1 });
    });
    process.env = { ...ORIGINAL_ENV, ANDROID_HOME: ANDROID, ANDROID_SDK_ROOT: undefined } as NodeJS.ProcessEnv;
  });
  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('detects NDK + CMake from disk and the legacy sdkmanager (no false negatives)', async () => {
    // Only the legacy sdkmanager + the NDK source.properties + the cmake dir exist.
    existsSyncMock.mockImplementation((p: string) =>
      p === legacySm || p === ndkProps || p === cmakeDir);

    const probes = await gatherProbes();
    expect(probes.androidHome).toBe(ANDROID);
    expect(probes.sdkmanager).toBe(true); // legacy layout counts
    expect(probes.ndk).toBe(REQUIREMENTS.ndk);
    expect(probes.cmake).toBe(REQUIREMENTS.cmake);
    expect(probes.platformTools).toBe(true);
    expect(probes.node).toBe('v20.0.0');
    expect(probes.jdk17).toBe('17.0.13');
  });

  it('accepts the modern cmdline-tools sdkmanager too', async () => {
    existsSyncMock.mockImplementation((p: string) => p === modernSm);
    const probes = await gatherProbes();
    expect(probes.sdkmanager).toBe(true);
    expect(probes.ndk).toBeNull();
    expect(probes.cmake).toBeNull();
  });

  it('reports null/false when nothing is on disk', async () => {
    existsSyncMock.mockReturnValue(false);
    const probes = await gatherProbes();
    expect(probes.sdkmanager).toBe(false);
    expect(probes.ndk).toBeNull();
    expect(probes.cmake).toBeNull();
  });

  it('skips SDK probing entirely when ANDROID_HOME is unset', async () => {
    process.env = { ...ORIGINAL_ENV, ANDROID_HOME: undefined, ANDROID_SDK_ROOT: undefined } as NodeJS.ProcessEnv;
    existsSyncMock.mockReturnValue(true); // would be true, but must not be consulted
    const probes = await gatherProbes();
    expect(probes.androidHome).toBeNull();
    expect(probes.sdkmanager).toBe(false);
    expect(probes.ndk).toBeNull();
    expect(probes.cmake).toBeNull();
    expect(existsSyncMock).not.toHaveBeenCalled();
  });
});
