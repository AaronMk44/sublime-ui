import { run } from '../util/exec.js';
import { resolveAdb } from './probe.js';

export function parseAdbDevices(stdout: string): string[] {
  const serials: string[] = [];
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('List of devices')) continue;
    const [serial, state] = trimmed.split(/\s+/);
    if (serial !== undefined && state === 'device') serials.push(serial);
  }
  return serials;
}

export async function listDevices(): Promise<string[]> {
  const res = await run(resolveAdb(process.env), ['devices']);
  return parseAdbDevices(res.stdout);
}

export async function installApk(serial: string, apkPath: string): Promise<void> {
  const res = await run(resolveAdb(process.env), ['-s', serial, 'install', '-r', apkPath]);
  if (res.exitCode !== 0) {
    throw new Error(`adb install failed:\n${res.stderr || res.stdout}`);
  }
}

export async function launchActivity(serial: string, pkg: string): Promise<void> {
  const res = await run(resolveAdb(process.env), [
    '-s', serial, 'shell', 'monkey', '-p', pkg,
    '-c', 'android.intent.category.LAUNCHER', '1',
  ]);
  if (res.exitCode !== 0) {
    throw new Error(`Failed to launch ${pkg}:\n${res.stderr || res.stdout}`);
  }
}
