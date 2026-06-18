import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  readAndroidPackageId,
  findApk,
  ensureLocalProperties,
  gradleTaskFor,
} from '../src/commands/build.js';

describe('gradleTaskFor', () => {
  it('maps flags to Gradle tasks', () => {
    expect(gradleTaskFor({ release: true, aab: false })).toBe('assembleRelease');
    expect(gradleTaskFor({ release: false, aab: false })).toBe('assembleDebug');
    expect(gradleTaskFor({ release: true, aab: true })).toBe('bundleRelease');
  });
});

describe('readAndroidPackageId', () => {
  let dir = '';
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'app-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('reads expo.android.package', () => {
    const p = join(dir, 'app.json');
    writeFileSync(p, JSON.stringify({ expo: { android: { package: 'com.demo.demoapp' } } }));
    expect(readAndroidPackageId(p)).toBe('com.demo.demoapp');
  });
  it('returns null when missing', () => {
    const p = join(dir, 'app.json');
    writeFileSync(p, JSON.stringify({ expo: {} }));
    expect(readAndroidPackageId(p)).toBeNull();
  });
});

describe('ensureLocalProperties', () => {
  let dir = '';
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'proj-')); mkdirSync(join(dir, 'android')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('writes sdk.dir when absent', () => {
    ensureLocalProperties(dir, 'C:\\Users\\Public\\Android\\Sdk');
    const content = readFileSync(join(dir, 'android', 'local.properties'), 'utf8');
    expect(content).toMatch(/sdk\.dir=/);
  });
});

describe('findApk', () => {
  let dir = '';
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'proj-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('returns null when no apk for either variant', () => {
    expect(findApk(dir, 'release')).toBeNull();
    expect(findApk(dir, 'debug')).toBeNull();
  });
  it('finds the release apk', () => {
    const apkDir = join(dir, 'android', 'app', 'build', 'outputs', 'apk', 'release');
    mkdirSync(apkDir, { recursive: true });
    writeFileSync(join(apkDir, 'app-release.apk'), 'x');
    expect(existsSync(findApk(dir, 'release') ?? '')).toBe(true);
    expect(findApk(dir, 'debug')).toBeNull();
  });
  it('finds the debug apk', () => {
    const apkDir = join(dir, 'android', 'app', 'build', 'outputs', 'apk', 'debug');
    mkdirSync(apkDir, { recursive: true });
    writeFileSync(join(apkDir, 'app-debug.apk'), 'x');
    expect(existsSync(findApk(dir, 'debug') ?? '')).toBe(true);
    expect(findApk(dir, 'release')).toBeNull();
  });
});
