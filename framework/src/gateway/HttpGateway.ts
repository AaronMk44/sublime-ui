import type { Query, QueryFilter, QuerySort } from './Query.js';

// NOTE: The HttpGateway class is added to this file in Phase D and imports the
// toQueryString helper below. Phase D must NOT recreate or move this function.

const enc = encodeURIComponent;

/**
 * Serialize a Query into a REST query string (with a leading '?', or '' when
 * empty). Mirrors today's flat scalar form so existing endpoints are unchanged
 * (SP1 design §6.1):
 *   - eq scalar           -> field=value          (preserves today's ?storeId=7)
 *   - any other op        -> filter[field][op]=value
 *   - in                  -> repeated filter[field][in]=value keys
 *   - sort                -> sort=field / sort=-field (comma-joined, in order)
 *   - limit / offset      -> flat limit=/offset=
 * Keys and values are encodeURIComponent'd exactly as the legacy Gateway.index().
 */
export function toQueryString(q?: Query): string {
  if (!q) return '';
  const parts: string[] = [];

  if (q.filters) {
    for (const f of q.filters) parts.push(...serializeFilter(f));
  }

  if (q.sort && q.sort.length > 0) {
    parts.push(`sort=${enc(q.sort.map(sortToken).join(','))}`);
  }

  if (q.limit !== undefined) parts.push(`limit=${enc(String(q.limit))}`);
  if (q.offset !== undefined) parts.push(`offset=${enc(String(q.offset))}`);

  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

function serializeFilter(f: QueryFilter): string[] {
  if (f.op === 'eq') {
    // Flat scalar form — preserves today's ?field=value.
    return [`${enc(f.field)}=${enc(String(f.value))}`];
  }
  if (f.op === 'in') {
    const values = Array.isArray(f.value) ? f.value : [];
    return values.map((v) => `${filterKey(f.field, 'in')}=${enc(String(v))}`);
  }
  return [`${filterKey(f.field, f.op)}=${enc(String(f.value))}`];
}

/** filter[field][op] with encoded brackets, e.g. filter%5Bscore%5D%5Bgte%5D. */
function filterKey(field: string, op: string): string {
  return `filter%5B${enc(field)}%5D%5B${op}%5D`;
}

function sortToken(s: QuerySort): string {
  return s.dir === 'desc' ? `-${s.field}` : s.field;
}
