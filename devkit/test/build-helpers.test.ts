import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  readAndroidPackageId,
  findReleaseApk,
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

describe('findReleaseApk', () => {
  let dir = '';
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'proj-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('returns null when no apk', () => {
    expect(findReleaseApk(dir)).toBeNull();
  });
  it('returns the path when the apk exists', () => {
    const apkDir = join(dir, 'android', 'app', 'build', 'outputs', 'apk', 'release');
    mkdirSync(apkDir, { recursive: true });
    writeFileSync(join(apkDir, 'app-release.apk'), 'x');
    expect(existsSync(findReleaseApk(dir) ?? '')).toBe(true);
  });
});
