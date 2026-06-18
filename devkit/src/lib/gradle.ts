/**
 * Scans Gradle output for sdkmanager package ids the build needs but lacks.
 * Matches tokens of the form `pkg;version` (e.g. ndk;27.1.12297006,
 * cmake;3.22.1, platforms;android-35). De-duplicated, first-seen order.
 */
export function parseMissingSdkComponents(output: string): string[] {
  const idPattern = /\b([a-z][a-z-]*(?:;[A-Za-z0-9._-]+)+)/g;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const match of output.matchAll(idPattern)) {
    const id = match[1];
    if (id === undefined || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

import { join } from 'node:path';
import { run } from '../util/exec.js';
import { ensureComponents } from './sdkmanager.js';
import { log } from '../util/log.js';

export function gradlewPath(projectAndroidDir: string): string {
  const script = process.platform === 'win32' ? 'gradlew.bat' : 'gradlew';
  return join(projectAndroidDir, script);
}

export interface GradleRunResult {
  exitCode: number;
  output: string;
}

export interface HealingOptions {
  androidDir: string;
  task: string;
  jdk17Home: string;
  androidHome: string;
  maxAttempts?: number;
  runner?: (task: string) => Promise<GradleRunResult>;
  installer?: (ids: string[]) => Promise<void>;
}

async function defaultRunner(
  androidDir: string,
  task: string,
  jdk17Home: string,
  androidHome: string,
): Promise<GradleRunResult> {
  const gw = gradlewPath(androidDir);
  const env = { JAVA_HOME: jdk17Home, ANDROID_HOME: androidHome };
  // Capture output for parsing while still echoing progress.
  const res = await run(gw, [task, '--no-daemon', '--stacktrace'], {
    cwd: androidDir,
    env,
  });
  process.stdout.write(res.stdout);
  process.stderr.write(res.stderr);
  return { exitCode: res.exitCode, output: `${res.stdout}\n${res.stderr}` };
}

export async function runGradleWithHealing(opts: HealingOptions): Promise<void> {
  const maxAttempts = opts.maxAttempts ?? 4;
  const runner =
    opts.runner ??
    ((task: string) =>
      defaultRunner(opts.androidDir, task, opts.jdk17Home, opts.androidHome));
  const installer =
    opts.installer ??
    ((ids: string[]) =>
      ensureComponents(opts.androidHome, ids, opts.jdk17Home));

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    log.step(`Gradle ${opts.task} (attempt ${attempt}/${maxAttempts})…`);
    const result = await runner(opts.task);
    if (result.exitCode === 0) {
      log.success(`Gradle ${opts.task} succeeded.`);
      return;
    }
    const missing = parseMissingSdkComponents(result.output);
    if (missing.length === 0) {
      throw new Error(
        `Gradle failed with no installable SDK component to recover.\n${result.output.slice(-2000)}`,
      );
    }
    log.warn(`Missing SDK components: ${missing.join(', ')} — installing…`);
    await installer(missing);
  }
  throw new Error(`Gradle ${opts.task} failed after ${maxAttempts} attempts.`);
}
