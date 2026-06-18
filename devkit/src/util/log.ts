import pc from 'picocolors';

export interface TableRow {
  label: string;
  ok: boolean;
  detail: string;
}

/** Pure: builds an aligned ✓/✗ table string (no color codes in content). */
export function renderTable(rows: TableRow[]): string {
  const width = rows.reduce((m, r) => Math.max(m, r.label.length), 0);
  return rows
    .map((r) => {
      const mark = r.ok ? '✓' : '✗';
      return `${mark} ${r.label.padEnd(width)}  ${r.detail}`;
    })
    .join('\n');
}

export const log = {
  info: (m: string): void => console.log(m),
  step: (m: string): void => console.log(pc.cyan(`→ ${m}`)),
  success: (m: string): void => console.log(pc.green(`✓ ${m}`)),
  warn: (m: string): void => console.log(pc.yellow(`! ${m}`)),
  error: (m: string): void => console.error(pc.red(`✗ ${m}`)),
  table: (rows: TableRow[]): void => {
    const width = rows.reduce((m, r) => Math.max(m, r.label.length), 0);
    for (const r of rows) {
      const mark = r.ok ? pc.green('✓') : pc.red('✗');
      console.log(`${mark} ${r.label.padEnd(width)}  ${pc.dim(r.detail)}`);
    }
  },
};
