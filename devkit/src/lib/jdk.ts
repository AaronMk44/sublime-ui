import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { run, runInherit } from '../util/exec.js';
import { JDK_DOWNLOAD } from './requirements.js';
import { log } from '../util/log.js';

export function sublimeHomeDir(): string {
  return join(homedir(), '.sublime');
}

/**
 * Returns a JDK 17 home. On Windows, downloads a portable Temurin 17 into
 * ~/.sublime/jdk-17 if absent (no admin; system Java untouched). On other
 * platforms, expects JDK 17 on PATH and returns JAVA_HOME or throws.
 */
export async function ensurePortableJdk17(): Promise<string> {
  if (process.platform !== 'win32') {
    const home = process.env['JAVA_HOME'];
    if (home && existsSync(home)) return home;
    throw new Error(
      'JDK 17 required. Install it (e.g. `brew install temurin@17`) and set JAVA_HOME.',
    );
  }

  const root = join(sublimeHomeDir(), 'jdk-17');
  const marker = join(root, 'bin', 'java.exe');
  if (existsSync(marker)) return root;

  mkdirSync(sublimeHomeDir(), { recursive: true });
  const zipPath = join(sublimeHomeDir(), 'jdk-17.zip');
  log.step('Downloading portable JDK 17 (Temurin)…');
  // Use PowerShell for download + expand to avoid extra deps.
  await runInherit('powershell', [
    '-NoProfile',
    '-Command',
    `Invoke-WebRequest -Uri '${JDK_DOWNLOAD.windowsX64}' -OutFile '${zipPath}'`,
  ]);
  log.step('Extracting JDK 17…');
  await runInherit('powershell', [
    '-NoProfile',
    '-Command',
    `Expand-Archive -Path '${zipPath}' -DestinationPath '${join(sublimeHomeDir(), 'jdk-17-tmp')}' -Force`,
  ]);
  // Temurin zip extracts to a versioned subfolder; find the one with bin/java.exe.
  const tmp = join(sublimeHomeDir(), 'jdk-17-tmp');
  const inner = (await run('powershell', [
    '-NoProfile',
    '-Command',
    `(Get-ChildItem -Directory '${tmp}' | Select-Object -First 1).FullName`,
  ])).stdout.trim();
  await runInherit('powershell', [
    '-NoProfile',
    '-Command',
    `Move-Item -Path '${inner}' -Destination '${root}' -Force`,
  ]);
  if (!existsSync(marker)) {
    throw new Error('Portable JDK 17 extraction failed.');
  }
  return root;
}
