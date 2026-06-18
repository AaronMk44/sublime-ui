/** Java prints `… version "X"` to stderr. Returns the quoted version. */
export function parseJavaVersion(stderr: string): string | null {
  const match = stderr.match(/version "([^"]+)"/);
  return match ? (match[1] ?? null) : null;
}

/** Parses `adb --version` ("Android Debug Bridge version 1.0.41"). */
export function parseAdbVersion(stdout: string): string | null {
  const match = stdout.match(/version (\d+\.\d+\.\d+)/);
  return match ? (match[1] ?? null) : null;
}

/**
 * Parses `sdkmanager --list_installed` pipe-delimited rows into
 * { "<package;path>": "<version>" }. Header/separator rows are skipped.
 */
export function parseSdkmanagerInstalled(
  stdout: string,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of stdout.split('\n')) {
    if (!rawLine.includes('|')) continue;
    const cells = rawLine.split('|').map((c) => c.trim());
    const path = cells[0];
    const version = cells[1];
    if (path === undefined || version === undefined) continue;
    if (path === '' || path === 'Path' || path.startsWith('---')) continue;
    if (version === 'Version') continue;
    result[path] = version;
  }
  return result;
}
