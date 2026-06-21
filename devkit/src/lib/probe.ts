import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { run } from '../util/exec.js';
import {
  parseJavaVersion,
  parseAdbVersion,
} from './detect.js';
import { REQUIREMENTS } from './requirements.js';
import { managedSdkDir, hasCmdlineTools } from './android-sdk.js';
import { sublimeHomeDir, hasJava } from './jdk.js';
import type { Probes } from './doctor-report.js';

export function resolveAndroidHome(env: NodeJS.ProcessEnv): string | null {
  return env['ANDROID_HOME'] ?? env['ANDROID_SDK_ROOT'] ?? null;
}

/** Resolves the effective Android SDK: env first, else the managed SDK. */
export function resolveAndroidSdk(
  env: NodeJS.ProcessEnv,
): { path: string | null; source: 'env' | 'managed' | null } {
  const fromEnv = resolveAndroidHome(env);
  if (fromEnv !== null) return { path: fromEnv, source: 'env' };
  const managed = managedSdkDir();
  if (hasCmdlineTools(managed)) return { path: managed, source: 'managed' };
  return { path: null, source: null };
}

/** The adb binary inside an SDK's platform-tools. */
export function adbPath(androidHome: string): string {
  const bin = process.platform === 'win32' ? 'adb.exe' : 'adb';
  return join(androidHome, 'platform-tools', bin);
}

/** Resolves the adb to invoke: the managed/SDK platform-tools adb if present, else PATH `adb`. */
export function resolveAdb(env: NodeJS.ProcessEnv): string {
  const { path: sdk } = resolveAndroidSdk(env);
  if (sdk !== null && existsSync(adbPath(sdk))) return adbPath(sdk);
  return 'adb';
}

export function sdkmanagerPath(androidHome: string): string {
  const bin = process.platform === 'win32' ? 'sdkmanager.bat' : 'sdkmanager';
  return join(androidHome, 'cmdline-tools', 'latest', 'bin', bin);
}

/** Legacy SDK layout (older `tools/bin`) — still valid for sdkmanager detection. */
export function legacySdkmanagerPath(androidHome: string): string {
  const bin = process.platform === 'win32' ? 'sdkmanager.bat' : 'sdkmanager';
  return join(androidHome, 'tools', 'bin', bin);
}

export async function gatherProbes(): Promise<Probes> {
  const nodeRes = await run(process.execPath, ['-v']);

  // Prefer the managed JDK; fall back to PATH `java`.
  const managedJdk = join(sublimeHomeDir(), 'jdk-17');
  let jdk17: string | null = null;
  let jdkSource: 'managed' | 'path' | undefined;
  if (hasJava(managedJdk)) {
    const res = await run(join(managedJdk, 'bin', process.platform === 'win32' ? 'java.exe' : 'java'), ['-version']);
    jdk17 = parseJavaVersion(res.stderr);
    jdkSource = 'managed';
  } else {
    const res = await run('java', ['-version']);
    jdk17 = parseJavaVersion(res.stderr);
    if (jdk17 !== null) jdkSource = 'path';
  }

  const { path: androidHome, source: androidHomeSource } = resolveAndroidSdk(process.env);

  let sdkmanager = false;
  let ndk: string | null = null;
  let cmake: string | null = null;
  if (androidHome !== null) {
    // sdkmanager: accept either the modern cmdline-tools/latest or the legacy
    // tools/bin layout — both can drive an SDK install.
    sdkmanager =
      existsSync(sdkmanagerPath(androidHome)) ||
      existsSync(legacySdkmanagerPath(androidHome));

    // Detect NDK/CMake straight from the filesystem rather than spawning
    // sdkmanager --list_installed, which misses installs on legacy SDK layouts.
    if (existsSync(join(androidHome, 'ndk', REQUIREMENTS.ndk, 'source.properties'))) {
      ndk = REQUIREMENTS.ndk;
    }
    if (existsSync(join(androidHome, 'cmake', REQUIREMENTS.cmake))) {
      cmake = REQUIREMENTS.cmake;
    }
  }

  // platform-tools is present if the resolved (managed or env) SDK has adb on
  // disk OR a PATH `adb` works. The on-disk check fixes managed installs where
  // adb is at <sdk>/platform-tools/adb but is not on PATH.
  const adbRes = await run('adb', ['--version']);
  const platformTools =
    (androidHome !== null && existsSync(adbPath(androidHome))) ||
    parseAdbVersion(adbRes.stdout) !== null;

  return {
    node: nodeRes.stdout.trim() || null,
    jdk17,
    ...(jdkSource ? { jdkSource } : {}),
    androidHome,
    ...(androidHomeSource ? { androidHomeSource } : {}),
    sdkmanager,
    platformTools,
    ndk,
    cmake,
  };
}
