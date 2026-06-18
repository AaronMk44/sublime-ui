import { existsSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ensurePortableJdk17 } from '../lib/jdk.js';
import { resolveAndroidHome } from '../lib/probe.js';
import { runGradleWithHealing } from '../lib/gradle.js';
import { runInherit } from '../util/exec.js';
import { log } from '../util/log.js';

export function gradleTaskFor(opts: { release: boolean; aab: boolean }): string {
  if (opts.aab) return 'bundleRelease';
  return opts.release ? 'assembleRelease' : 'assembleDebug';
}

export function readAndroidPackageId(appJsonPath: string): string | null {
  if (!existsSync(appJsonPath)) return null;
  const json = JSON.parse(readFileSync(appJsonPath, 'utf8')) as {
    expo?: { android?: { package?: string } };
  };
  return json.expo?.android?.package ?? null;
}

export function findReleaseApk(projectDir: string): string | null {
  const p = join(
    projectDir,
    'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk',
  );
  return existsSync(p) ? p : null;
}

export function ensureLocalProperties(
  projectDir: string,
  androidHome: string,
): void {
  const target = join(projectDir, 'android', 'local.properties');
  if (existsSync(target)) return;
  const escaped = androidHome.replace(/\\/g, '\\\\');
  writeFileSync(target, `sdk.dir=${escaped}\n`);
}

export async function buildCommand(opts: {
  project: string;
  release: boolean;
  aab: boolean;
}): Promise<number> {
  const androidHome = resolveAndroidHome(process.env);
  if (androidHome === null) {
    log.error('ANDROID_HOME/ANDROID_SDK_ROOT not set. Run: sublime doctor');
    return 1;
  }

  // 1. Prebuild if native android/ project is absent.
  const androidDir = join(opts.project, 'android');
  if (!existsSync(androidDir)) {
    log.step('Generating native Android project (expo prebuild)…');
    const code = await runInherit('npx', [
      'expo', 'prebuild', '--platform', 'android', '--no-install',
    ], { cwd: opts.project });
    if (code !== 0 || !existsSync(androidDir)) {
      log.error('expo prebuild failed.');
      return 1;
    }
  }

  // 2. Ensure local.properties + scoped JDK 17.
  ensureLocalProperties(opts.project, androidHome);
  const jdk17Home = await ensurePortableJdk17();

  // 3. Scoped, self-healing Gradle build. runGradleWithHealing resolves on
  //    success and THROWS on failure (after bounded retries / unrecoverable
  //    error); the throw propagates to the CLI's top-level catch → exit 1.
  const task = gradleTaskFor({ release: opts.release, aab: opts.aab });
  await runGradleWithHealing({ androidDir, task, jdk17Home, androidHome });

  // 4. Report artifact. (Reached only when the build succeeded.)
  if (!opts.aab) {
    const apk = findReleaseApk(opts.project);
    if (apk === null) {
      log.error('Build reported success but no release APK was found.');
      return 1;
    }
    const mb = (statSync(apk).size / (1024 * 1024)).toFixed(1);
    log.success(`APK ready: ${apk} (${mb} MB)`);
  } else {
    log.success('AAB built under android/app/build/outputs/bundle/release/.');
  }
  return 0;
}
