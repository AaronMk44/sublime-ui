import { describe, it, expect } from 'vitest';
import { parseMissingSdkComponents } from '../src/lib/gradle.js';

describe('parseMissingSdkComponents', () => {
  it('extracts NDK and CMake ids from the real failure text', () => {
    const stderr = [
      '> Task :app:configureCMakeRelWithDebInfo FAILED',
      'com.android.builder.sdk.InstallFailedException: Failed to install the following SDK components:',
      '      ndk;27.1.12297006 NDK (Side by side) 27.1.12297006',
      '      cmake;3.22.1 CMake 3.22.1',
      'The SDK directory is not writable…',
    ].join('\n');
    expect(parseMissingSdkComponents(stderr)).toEqual([
      'ndk;27.1.12297006',
      'cmake;3.22.1',
    ]);
  });

  it('handles a single missing component', () => {
    const stderr =
      'Failed to install the following Android SDK packages as some licences have not been accepted.\n   ndk;27.1.12297006 NDK (Side by side)';
    expect(parseMissingSdkComponents(stderr)).toEqual(['ndk;27.1.12297006']);
  });

  it('de-duplicates repeated ids', () => {
    const stderr = 'need cmake;3.22.1\nalso cmake;3.22.1 again';
    expect(parseMissingSdkComponents(stderr)).toEqual(['cmake;3.22.1']);
  });

  it('returns empty array when nothing is missing', () => {
    expect(parseMissingSdkComponents('BUILD SUCCESSFUL in 42s')).toEqual([]);
  });
});
