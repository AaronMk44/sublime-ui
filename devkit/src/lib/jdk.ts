import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { resolveJdkUrl } from './requirements.js';
import { downloadFile, type ProgressFn } from '../util/download.js';
import { extractArchive } from '../util/archive.js';
import { log } from '../util/log.js';

export function sublimeHomeDir(): string {
  return join(homedir(), '.sublime');
}

/** True if `home/bin/java` or `home/bin/java.exe` exists. */
export function hasJava(home: string): boolean {
  return (
    existsSync(join(home, 'bin', 'java')) ||
    existsSync(join(home, 'bin', 'java.exe'))
  );
}

function listDirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => join(dir, e.name));
}

/**
 * Given an extracted Temurin archive, returns the inner directory that is a
 * valid JAVA_HOME. Temurin extracts a single versioned top-level folder whose
 * java lives at `bin/java` (Windows/Linux) or `Contents/Home/bin/java`
 * (macOS). Returns null if none is found.
 */
export function findJavaHomeRoot(extractedDir: string): string | null {
  for (const root of [extractedDir, ...listDirs(extractedDir)]) {
    for (const home of [root, join(root, 'Contents', 'Home')]) {
      if (hasJava(home)) return home;
    }
  }
  return null;
}

export interface InstallDeps {
  download: (url: string, dest: string, onProgress?: ProgressFn) => Promise<void>;
  extract: (archive: string, dest: string) => Promise<void>;
}

const defaultDeps: InstallDeps = { download: downloadFile, extract: extractArchive };

export interface EnsureJdkOptions {
  deps?: InstallDeps;
  workDir?: string;
}

/**
 * Ensures a managed Temurin JDK 17 at `<workDir>/jdk-17` (default
 * `~/.sublime/jdk-17`) on every platform. Downloads + extracts + normalizes
 * the layout if absent; idempotent otherwise. Returns the JAVA_HOME path.
 */
export async function ensureManagedJdk17(opts: EnsureJdkOptions = {}): Promise<string> {
  const deps = opts.deps ?? defaultDeps;
  const workDir = opts.workDir ?? sublimeHomeDir();
  const root = join(workDir, 'jdk-17');
  if (hasJava(root)) return root;

  const url = resolveJdkUrl(process.platform, process.arch);
  const ext = url.endsWith('.zip') ? '.zip' : '.tar.gz';
  mkdirSync(workDir, { recursive: true });
  const archive = join(workDir, `jdk-17${ext}`);
  const tmp = join(workDir, 'jdk-17-tmp');
  rmSync(tmp, { recursive: true, force: true });
  rmSync(root, { recursive: true, force: true });

  log.step('Downloading JDK 17 (Temurin)…');
  await deps.download(url, archive, (received, total) => log.progress(received, total));
  log.progressDone();
  log.step('Extracting JDK 17…');
  await deps.extract(archive, tmp);

  const home = findJavaHomeRoot(tmp);
  if (home === null) {
    throw new Error('JDK 17 archive did not contain a JDK (no bin/java).');
  }
  renameSync(home, root);
  rmSync(tmp, { recursive: true, force: true });
  rmSync(archive, { force: true });
  if (!hasJava(root)) {
    throw new Error(`Managed JDK 17 install incomplete (no bin/java at ${root}).`);
  }
  return root;
}

/** @deprecated use ensureManagedJdk17. Kept as an alias during migration. */
export const ensurePortableJdk17 = (): Promise<string> => ensureManagedJdk17();
