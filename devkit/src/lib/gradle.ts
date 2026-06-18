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
