import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { sdkmanagerPath } from './probe.js';
import { run, type RunResult, type RunOptions } from '../util/exec.js';
import { log } from '../util/log.js';

/** A complete NDK has source.properties, an ndk-build script, and clang. */
export function isValidNdk(ndkDir: string): boolean {
  if (!existsSync(join(ndkDir, 'source.properties'))) return false;
  const hasNdkBuild =
    existsSync(join(ndkDir, 'ndk-build')) ||
    existsSync(join(ndkDir, 'ndk-build.cmd'));
  if (!hasNdkBuild) return false;
  const llvmBin = join(ndkDir, 'toolchains', 'llvm', 'prebuilt');
  if (!existsSync(llvmBin)) return false;
  // any host subdir containing a clang binary
  for (const host of readdirSync(llvmBin)) {
    const bin = join(llvmBin, host, 'bin');
    if (
      existsSync(join(bin, 'clang.exe')) ||
      existsSync(join(bin, 'clang'))
    ) {
      return true;
    }
  }
  return false;
}

export type Runner = (
  file: string,
  args: string[],
  opts: RunOptions,
) => Promise<RunResult>;

/**
 * Accepts all Android SDK licenses non-interactively by piping "y" lines into
 * `sdkmanager --licenses`, scoped to the managed JDK and SDK root. Returns the
 * sdkmanager exit code.
 */
export async function acceptLicenses(
  sdkRoot: string,
  jdkHome: string,
  runner: Runner = run,
): Promise<number> {
  const smPath = sdkmanagerPath(sdkRoot);
  const env = { JAVA_HOME: jdkHome, ANDROID_HOME: sdkRoot };
  // sdkmanager prompts y/N for each license; feed plenty of acceptances.
  const input = 'y\n'.repeat(50);
  const res = await runner(smPath, [`--sdk_root=${sdkRoot}`, '--licenses'], { env, input });
  return res.exitCode;
}

function ndkDirFor(androidHome: string, id: string): string | null {
  const m = id.match(/^ndk;(.+)$/);
  return m ? join(androidHome, 'ndk', m[1] ?? '') : null;
}

/**
 * Installs the given sdkmanager ids, scoped to JDK 17, accepting licenses.
 * Removes and reinstalls any NDK dir that validates as corrupt.
 */
export async function ensureComponents(
  androidHome: string,
  ids: string[],
  jdk17Home: string,
): Promise<void> {
  if (ids.length === 0) return;
  const smPath = sdkmanagerPath(androidHome);
  const env = { JAVA_HOME: jdk17Home, ANDROID_HOME: androidHome };

  for (const id of ids) {
    const ndkDir = ndkDirFor(androidHome, id);
    if (ndkDir !== null && existsSync(ndkDir) && !isValidNdk(ndkDir)) {
      log.warn(`Removing corrupt NDK at ${ndkDir}`);
      rmSync(ndkDir, { recursive: true, force: true });
    }
    log.step(`Installing ${id} …`);
    const res = await run(smPath, [`--sdk_root=${androidHome}`, id, '--channel=0'], {
      env,
    });
    if (res.exitCode !== 0) {
      // First attempt can fail on unaccepted licenses; accept them then retry once.
      await run(smPath, [`--sdk_root=${androidHome}`, '--licenses'], { env });
      const retry = await run(
        smPath,
        [`--sdk_root=${androidHome}`, id, '--channel=0'],
        { env },
      );
      if (retry.exitCode !== 0) {
        throw new Error(`Failed to install ${id}:\n${retry.stderr || retry.stdout}`);
      }
    }
    if (ndkDir !== null && !isValidNdk(ndkDir)) {
      throw new Error(`NDK install incomplete at ${ndkDir}`);
    }
  }
}
