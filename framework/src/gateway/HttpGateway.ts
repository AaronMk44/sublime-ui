import { http, type RequestConfig } from './http.js';
import { HttpError } from './HttpError.js';
import type { Gateway, RequestCapableGateway, Row, Id } from './Gateway.js';
import type { GatewayDeps } from './GatewayDeps.js';
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

/**
 * REST strategy. Returns RAW rows (http.request unwraps the envelope) and throws
 * typed DataErrors. show() maps a 404 to null (absence is not a failure). The
 * only request-capable gateway: Model.call() routes here.
 */
export class HttpGateway implements RequestCapableGateway {
  constructor(private readonly deps: GatewayDeps) {}

  private get resource(): string {
    return this.deps.resource;
  }

  index(query?: Query): Promise<Row[]> {
    return http.request<Row[]>({ url: `${this.resource}${toQueryString(query)}` });
  }

  async show(id: Id): Promise<Row | null> {
    try {
      return await http.request<Row>({ url: `${this.resource}/${id}` });
    } catch (e) {
      if (e instanceof HttpError && e.status === 404) return null;
      throw e;
    }
  }

  create(body: Row): Promise<Row> {
    return http.request<Row>({ url: this.resource, method: 'POST', body });
  }

  update(id: Id, body: Row): Promise<Row> {
    return http.request<Row>({ url: `${this.resource}/${id}`, method: 'PUT', body });
  }

  async destroy(id: Id): Promise<void> {
    await http.request<unknown>({ url: `${this.resource}/${id}`, method: 'DELETE' });
  }

  request<T>(config: RequestConfig): Promise<T> {
    return http.request<T>(config);
  }
}

// Compile-time guard: HttpGateway satisfies the Gateway interface.
const _typecheck: new (deps: GatewayDeps) => Gateway = HttpGateway;
void _typecheck;
