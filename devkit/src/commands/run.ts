import { join } from 'node:path';
import { listDevices, installApk, launchActivity } from '../lib/android.js';
import { readAndroidPackageId, findApk } from './build.js';
import { log } from '../util/log.js';

export async function runCommand(opts: {
  project: string;
  device?: string;
}): Promise<number> {
  const apk =
    findApk(opts.project, 'release') ?? findApk(opts.project, 'debug');
  if (apk === null) {
    log.error('No APK found. Run: sublime build');
    return 1;
  }
  const devices = await listDevices();
  if (devices.length === 0) {
    log.error('No connected device/emulator. Start one and retry.');
    return 1;
  }
  const serial = opts.device ?? devices[0];
  if (serial === undefined) return 1;

  log.step(`Installing ${apk} on ${serial}…`);
  await installApk(serial, apk);
  const pkg = readAndroidPackageId(join(opts.project, 'app.json'));
  if (pkg === null) {
    log.error('Could not read android.package from app.json');
    return 1;
  }
  log.step(`Launching ${pkg}…`);
  await launchActivity(serial, pkg);
  log.success('Launched.');
  return 0;
}
