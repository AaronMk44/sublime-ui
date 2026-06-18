import { join } from 'node:path';
import { run } from '../util/exec.js';
import {
  parseJavaVersion,
  parseAdbVersion,
  parseSdkmanagerInstalled,
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

export async function gatherProbes(): Promise<Probes> {
  const nodeRes = await run(process.execPath, ['-v']);
  const javaRes = await run('java', ['-version']);
  const androidHome = resolveAndroidHome(process.env);

  let sdkmanager = false;
  let installed: Record<string, string> = {};
  if (androidHome !== null) {
    const smPath = sdkmanagerPath(androidHome);
    const listRes = await run(smPath, ['--list_installed']);
    sdkmanager = listRes.exitCode === 0;
    installed = parseSdkmanagerInstalled(listRes.stdout);
  }

  const adbRes = await run('adb', ['--version']);

  return {
    node: nodeRes.stdout.trim() || null,
    jdk17: parseJavaVersion(javaRes.stderr),
    androidHome,
    sdkmanager,
    platformTools: parseAdbVersion(adbRes.stdout) !== null,
    ndk: installed[`ndk;${REQUIREMENTS.ndk}`] ?? null,
    cmake: installed[`cmake;${REQUIREMENTS.cmake}`] ?? null,
  };
}
