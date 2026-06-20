import type { Gateway, Row, Id } from './Gateway.js';
import type { GatewayDeps } from './GatewayDeps.js';
import type { Query } from './Query.js';
import { getDatabaseAdapter } from '../config/Config.js';
import { genId } from './genId.js';

/**
 * One platform-agnostic Gateway over a local document store. It owns no engine:
 * it resolves the configured DatabaseAdapter via getDatabaseAdapter() on every
 * call (so a late configureSublime is honored and a missing adapter surfaces as
 * ConfigError), then delegates. Model remains the single writer to the slice.
 */
export class DbGateway implements Gateway {
  constructor(private readonly deps: GatewayDeps) {}

  async index(query?: Query): Promise<Row[]> {
    const db = getDatabaseAdapter();
    return query ? db.query(this.deps.resource, query) : db.getAll(this.deps.resource);
  }

  async show(id: Id): Promise<Row | null> {
    return getDatabaseAdapter().get(this.deps.resource, id);
  }

  async create(body: Row): Promise<Row> {
    const k = this.deps.idKey;
    const row = body[k] == null ? { ...body, [k]: genId() } : body;
    return getDatabaseAdapter().insert(this.deps.resource, row);
  }

  async update(id: Id, body: Row): Promise<Row> {
    return getDatabaseAdapter().update(this.deps.resource, id, body);
  }

  async destroy(id: Id): Promise<void> {
    await getDatabaseAdapter().delete(this.deps.resource, id);
  }
}
