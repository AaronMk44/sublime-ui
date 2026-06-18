import { describe, it, expect } from 'vitest';
import { resolveAndroidHome, sdkmanagerPath } from '../src/lib/probe.js';

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
