import type { Query, QueryFilter, QuerySort } from '@sublime-ui/framework';

const TABLE_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Validate and quote a SQL identifier (table name). Field paths are passed as
 * BOUND parameters (`json_extract(doc, ?)`), so only the table name needs
 * identifier validation — anything outside `^[A-Za-z_][A-Za-z0-9_]*$` throws.
 */
export function ident(name: string): string {
  if (!TABLE_RE.test(name)) {
    throw new Error(`Invalid SQL identifier: ${JSON.stringify(name)}`);
  }
  return `"${name}"`;
}

/** `$.field` JSON path for json_extract — bound as a parameter (no injection). */
function jsonPath(field: string): string {
  return `$.${field}`;
}

/** Escape LIKE wildcards in a raw term, then wrap as a contains pattern. */
function likePattern(term: string): string {
  const escaped = term.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  return `%${escaped}%`;
}

/**
 * Build a parameterized SELECT over a `(id TEXT PRIMARY KEY, doc TEXT)` table.
 * (SP1 §6.1.) Each filter -> `json_extract(doc, ?) <op> ?` (eq null -> IS NULL;
 * in -> IN (?, …); like -> LIKE ? ESCAPE '\\' wrapping %term%); sort ->
 * ORDER BY json_extract(doc, ?) ASC|DESC; LIMIT/OFFSET as bound params. The
 * table name is validated via `ident`; every field path / value is bound.
 */
export function buildSelect(table: string, q: Query): { sql: string; params: unknown[] } {
  const parts: string[] = [`SELECT doc FROM ${ident(table)}`];
  const params: unknown[] = [];

  if (q.filters && q.filters.length > 0) {
    const clauses = q.filters.map((f) => filterClause(f, params));
    parts.push(`WHERE ${clauses.join(' AND ')}`);
  }

  if (q.sort && q.sort.length > 0) {
    const order = q.sort.map((s: QuerySort) => {
      params.push(jsonPath(s.field));
      return `json_extract(doc, ?) ${s.dir === 'desc' ? 'DESC' : 'ASC'}`;
    });
    parts.push(`ORDER BY ${order.join(', ')}`);
  }

  // SQLite requires LIMIT to precede OFFSET; a bare OFFSET is a syntax error.
  // When only `offset` is supplied, synthesize `LIMIT -1` (no upper bound).
  if (q.limit !== undefined) {
    parts.push('LIMIT ?');
    params.push(q.limit);
  } else if (q.offset !== undefined) {
    parts.push('LIMIT -1');
  }
  if (q.offset !== undefined) {
    parts.push('OFFSET ?');
    params.push(q.offset);
  }

  return { sql: parts.join(' '), params };
}

function filterClause(f: QueryFilter, params: unknown[]): string {
  if (f.op === 'eq' && f.value === null) {
    params.push(jsonPath(f.field));
    return 'json_extract(doc, ?) IS NULL';
  }
  if (f.op === 'ne' && f.value === null) {
    params.push(jsonPath(f.field));
    return 'json_extract(doc, ?) IS NOT NULL';
  }
  if (f.op === 'in') {
    const values = Array.isArray(f.value) ? f.value : [];
    if (values.length === 0) return '0'; // IN () is invalid SQL; 0 matches nothing
    params.push(jsonPath(f.field));
    const placeholders = values.map((v) => {
      params.push(v);
      return '?';
    });
    return `json_extract(doc, ?) IN (${placeholders.join(', ')})`;
  }
  if (f.op === 'like') {
    params.push(jsonPath(f.field));
    params.push(likePattern(String(f.value)));
    return "json_extract(doc, ?) LIKE ? ESCAPE '\\'";
  }
  const sqlOp = OP_SQL[f.op];
  if (sqlOp === undefined) {
    throw new Error(`Unsupported filter op: ${JSON.stringify(f.op)}`);
  }
  params.push(jsonPath(f.field));
  params.push(f.value);
  return `json_extract(doc, ?) ${sqlOp} ?`;
}

const OP_SQL: Record<'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte', string> = {
  eq: '=',
  ne: '<>',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
};
