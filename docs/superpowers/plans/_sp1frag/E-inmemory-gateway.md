### Task E1: InMemoryGateway (default strategy)

**Files:**
- Create: `framework/src/gateway/InMemoryGateway.ts`
- Test: `framework/test/InMemoryGateway.test.ts`

**Interfaces:**
- Consumes:
  - `Gateway` (interface `index(query?: Query): Promise<Row[]>; show(id: Id): Promise<Row | null>; create(body: Row): Promise<Row>; update(id: Id, body: Row): Promise<Row>; destroy(id: Id): Promise<void>`) from `framework/src/gateway/Gateway.ts`
  - `Row = Record<string, unknown>`, `Id = string | number` from `framework/src/gateway/Gateway.ts`
  - `GatewayDeps` (`{ resource: string; idKey: string; sliceName: string; actions: ModelSlice['actions']; store: Store }`) from `framework/src/gateway/GatewayDeps.ts`
  - `Query` (`{ filters?; sort?; limit?; offset? }`) from `framework/src/gateway/Query.ts`
  - `applyQuery(rows: Row[], q: Query): Row[]` from `framework/src/gateway/queryMatch.ts`
  - `genId(): string` from `framework/src/gateway/genId.ts`
  - `NotFoundError` (constructed `new NotFoundError(message, { resource, id })`) from `framework/src/errors/NotFoundError.js` (re-exported via `framework/src/errors/index.js`)
- Produces:
  - `InMemoryGateway` (`class InMemoryGateway implements Gateway`, constructor `(deps: GatewayDeps)`) from `framework/src/gateway/InMemoryGateway.ts` — consumed by `registerModel` (the default `GatewayClass`) and by the barrel `index.ts`.

- [ ] **Step 1: Write the failing test**
```ts
// framework/test/InMemoryGateway.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { InMemoryGateway } from '../src/gateway/InMemoryGateway.js';
import { createModelSlice } from '../src/store/createModelSlice.js';
import { NotFoundError } from '../src/errors/index.js';
import type { GatewayDeps } from '../src/gateway/GatewayDeps.js';
import type { Row } from '../src/gateway/Gateway.js';

// Builds a real, isolated Redux store holding one model slice named `notes`,
// then a GatewayDeps bundle pointing the gateway at that slice. The gateway must
// read state via deps.store.getState()[deps.sliceName].items — never a singleton.
function harness(seed: Row[] = []) {
  const slice = createModelSlice('notes', { idKey: 'id' });
  const store = configureStore({ reducer: { notes: slice.reducer } });
  if (seed.length) store.dispatch(slice.actions.setItems(seed));
  const deps: GatewayDeps = {
    resource: 'notes',
    idKey: 'id',
    sliceName: 'notes',
    actions: slice.actions,
    store,
  };
  const gateway = new InMemoryGateway(deps);
  const items = () => (store.getState().notes as { items: Row[] }).items;
  return { slice, store, deps, gateway, items };
}

describe('InMemoryGateway', () => {
  let h: ReturnType<typeof harness>;
  beforeEach(() => {
    h = harness([
      { id: '1', title: 'alpha', pinned: true },
      { id: '2', title: 'beta', pinned: false },
      { id: '3', title: 'gamma', pinned: true },
    ]);
  });

  it('index() with no query returns a defensive copy of every slice item', async () => {
    const rows = await h.gateway.index();
    expect(rows).toEqual([
      { id: '1', title: 'alpha', pinned: true },
      { id: '2', title: 'beta', pinned: false },
      { id: '3', title: 'gamma', pinned: true },
    ]);
    expect(rows).not.toBe(h.items());
  });

  it('index() with an empty slice returns []', async () => {
    const empty = harness();
    expect(await empty.gateway.index()).toEqual([]);
  });

  it('index(query) delegates filtering to applyQuery', async () => {
    const rows = await h.gateway.index({ filters: [{ field: 'pinned', op: 'eq', value: true }] });
    expect(rows.map((r) => r.id)).toEqual(['1', '3']);
  });

  it('show() returns the matching row by idKey', async () => {
    expect(await h.gateway.show('2')).toEqual({ id: '2', title: 'beta', pinned: false });
  });

  it('show() returns null for a genuinely absent id (not an error)', async () => {
    expect(await h.gateway.show('999')).toBeNull();
  });

  it('create() assigns a generated string id when body has none, and returns the row', async () => {
    const created = await h.gateway.create({ title: 'delta', pinned: false });
    expect(typeof created.id).toBe('string');
    expect((created.id as string).length).toBeGreaterThan(0);
    expect(created).toMatchObject({ title: 'delta', pinned: false });
  });

  it('create() honors a developer-supplied id', async () => {
    const created = await h.gateway.create({ id: 'custom', title: 'epsilon' });
    expect(created.id).toBe('custom');
  });

  it('create() does NOT write the slice itself (Model is the single writer)', async () => {
    const before = h.items().length;
    await h.gateway.create({ title: 'zeta' });
    expect(h.items().length).toBe(before);
  });

  it('update() returns the merged row, keeping the id', async () => {
    const updated = await h.gateway.update('2', { title: 'beta!' });
    expect(updated).toEqual({ id: '2', title: 'beta!', pinned: false });
  });

  it('update() throws NotFoundError for a missing id', async () => {
    await expect(h.gateway.update('999', { title: 'x' })).rejects.toBeInstanceOf(NotFoundError);
    await expect(h.gateway.update('999', { title: 'x' })).rejects.toMatchObject({
      resource: 'notes',
      id: '999',
    });
  });

  it('destroy() resolves to a no-op (Model dispatches removeItem)', async () => {
    const before = h.items().length;
    await expect(h.gateway.destroy('1')).resolves.toBeUndefined();
    expect(h.items().length).toBe(before);
  });
});
```
- [ ] **Step 2: Run the test, verify it fails**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/InMemoryGateway.test.ts`
Expected: FAIL with "Failed to resolve import \"../src/gateway/InMemoryGateway.js\"" (the module does not exist yet).
- [ ] **Step 3: Create `framework/src/gateway/InMemoryGateway.ts` (complete code)**
```ts
// framework/src/gateway/InMemoryGateway.ts
import type { Gateway, Row, Id } from './Gateway.js';
import type { GatewayDeps } from './GatewayDeps.js';
import type { Query } from './Query.js';
import { applyQuery } from './queryMatch.js';
import { genId } from './genId.js';
import { NotFoundError } from '../errors/index.js';

/**
 * Default storage strategy. The model's Redux slice is the source of truth.
 *
 * Reads come straight from the injected store
 * (`deps.store.getState()[deps.sliceName].items`) — NEVER from the global store
 * singleton, so the gateway is testable with any configureStore() and honors
 * the single-writer rule (§5.2): writes only COMPUTE and return rows; `Model`
 * dispatches `setItems`/`upsertItem`/`removeItem` to commit them.
 */
export class InMemoryGateway implements Gateway {
  constructor(private readonly deps: GatewayDeps) {}

  private items(): Row[] {
    const state = this.deps.store.getState() as Record<
      string,
      { items: Row[] } | undefined
    >;
    return state[this.deps.sliceName]?.items ?? [];
  }

  async index(query?: Query): Promise<Row[]> {
    const rows = this.items();
    return query ? applyQuery(rows, query) : rows.map((r) => ({ ...r }));
  }

  async show(id: Id): Promise<Row | null> {
    const key = this.deps.idKey;
    return this.items().find((r) => r[key] === id) ?? null;
  }

  async create(body: Row): Promise<Row> {
    const key = this.deps.idKey;
    return { ...body, [key]: body[key] ?? genId() };
  }

  async update(id: Id, body: Row): Promise<Row> {
    const key = this.deps.idKey;
    const current = this.items().find((r) => r[key] === id);
    if (!current) {
      throw new NotFoundError(`${this.deps.resource}#${id} not found`, {
        resource: this.deps.resource,
        id,
      });
    }
    return { ...current, ...body, [key]: id };
  }

  async destroy(_id: Id): Promise<void> {
    // No-op: Model.delete dispatches removeItem (Model.ts:110). The slice is the
    // source of truth, so there is nothing for the gateway to persist.
  }
}
```
- [ ] **Step 4: Run the test, verify it passes**
Run: `cd C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime/framework && npx vitest run test/InMemoryGateway.test.ts`
Expected: PASS (all assertions green).
- [ ] **Step 5: Commit**
```bash
git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" add framework/src/gateway/InMemoryGateway.ts framework/test/InMemoryGateway.test.ts && git -C "C:/Users/Aaron Mkandawire/VSCodeProjects/Sublime" commit -m "feat(framework): add InMemoryGateway default storage strategy"
```
