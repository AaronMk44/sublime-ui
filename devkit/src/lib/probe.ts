import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { run } from '../util/exec.js';
import {
  parseJavaVersion,
  parseAdbVersion,
} from './detect.js';
import { REQUIREMENTS } from './requirements.js';
import type { Probes } from './doctor-report.js';

export function resolveAndroidHome(env: NodeJS.ProcessEnv): string | null {
  return env['ANDROID_HOME'] ?? env['ANDROID_SDK_ROOT'] ?? null;
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
  const javaRes = await run('java', ['-version']);
  const androidHome = resolveAndroidHome(process.env);

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

  const adbRes = await run('adb', ['--version']);

  return {
    node: nodeRes.stdout.trim() || null,
    jdk17: parseJavaVersion(javaRes.stderr),
    androidHome,
    sdkmanager,
    platformTools: parseAdbVersion(adbRes.stdout) !== null,
    ndk,
    cmake,
  };
}
