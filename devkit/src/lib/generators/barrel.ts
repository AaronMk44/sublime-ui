export function updateBarrel(existing: string, line: string): string {
  const lines = existing.split('\n').map((l) => l.trim());
  if (lines.includes(line.trim())) return existing;
  const base = existing.length > 0 && !existing.endsWith('\n') ? existing + '\n' : existing;
  return `${base}${line}\n`;
}
