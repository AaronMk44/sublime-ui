import { describe, it, expect } from 'vitest';
import {
  parseJavaVersion,
  parseAdbVersion,
  parseSdkmanagerInstalled,
} from '../src/lib/detect.js';

describe('parseJavaVersion', () => {
  it('parses modern JDK output', () => {
    const stderr = 'openjdk version "17.0.13" 2024-10-15\nOpenJDK Runtime…';
    expect(parseJavaVersion(stderr)).toBe('17.0.13');
  });
  it('parses legacy Java 8 output', () => {
    const stderr = 'java version "1.8.0_202"\nJava(TM) SE Runtime…';
    expect(parseJavaVersion(stderr)).toBe('1.8.0_202');
  });
  it('returns null when absent', () => {
    expect(parseJavaVersion('command not found')).toBeNull();
  });
});

describe('parseAdbVersion', () => {
  it('extracts the adb version', () => {
    const out = 'Android Debug Bridge version 1.0.41\nVersion 35.0.2-12345';
    expect(parseAdbVersion(out)).toBe('1.0.41');
  });
  it('returns null when absent', () => {
    expect(parseAdbVersion('')).toBeNull();
  });
});

describe('parseSdkmanagerInstalled', () => {
  it('maps installed package paths to versions', () => {
    const out = [
      'Installed packages:',
      '  Path                 | Version       | Description',
      '  -------              | -------       | -------',
      '  ndk;27.1.12297006    | 27.1.12297006 | NDK (Side by side)',
      '  cmake;3.22.1         | 3.22.1        | CMake 3.22.1',
      '  platform-tools       | 35.0.2        | Android SDK Platform-Tools',
    ].join('\n');
    const map = parseSdkmanagerInstalled(out);
    expect(map['ndk;27.1.12297006']).toBe('27.1.12297006');
    expect(map['cmake;3.22.1']).toBe('3.22.1');
    expect(map['platform-tools']).toBe('35.0.2');
  });
  it('returns an empty map for empty input', () => {
    expect(parseSdkmanagerInstalled('')).toEqual({});
  });
});
