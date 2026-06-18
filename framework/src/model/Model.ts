import { useEffect } from 'react';
import { modelRegistry } from '../discovery/modelRegistry.js';
import { store } from '../store/store.js';
import { useAppSelector } from '../store/hooks.js';
import type { ModelSliceState } from '../store/createModelSlice.js';
import { hydrate, toPlain } from './cast.js';
import { ModelCollection } from './ModelCollection.js';
import { ApiError } from '../gateway/ApiError.js';
import type { RequestConfig } from '../gateway/http.js';

export type ModelCtor<T extends Model> = (new (
  attrs?: Record<string, unknown>,
) => T) &
  typeof Model;

export interface CallConfig<R> extends RequestConfig {
  store?: boolean;
  merge?: 'replace' | 'upsert' | 'remove';
  select?: (data: unknown) => R;
}

export class Model {
  protected static resource: string;

  constructor(attrs: Record<string, unknown> = {}) {
    Object.assign(this, attrs);
  }

  static make<T extends Model>(this: ModelCtor<T>, attrs: Partial<T>): T {
    return new this(attrs as Record<string, unknown>);
  }

  /** Resolves this model's gateway/slice/actions from the registry. */
  private static reg() {
    return modelRegistry.resolve(this);
  }

  private static fail(error: unknown): never {
    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError(error instanceof Error ? error.message : 'Unknown error', {
            status: 0,
            errors: error,
            url: this.resource ?? '',
          });
    console.error(`[${this.name}] ${apiError.message}`, apiError);
    store.dispatch(this.reg().actions.setError(apiError));
    throw apiError;
  }

  static async all<T extends Model>(
    this: ModelCtor<T>,
    query?: Record<string, string | number>,
  ): Promise<ModelCollection<T>> {
    const reg = (this as typeof Model).reg();
    try {
      store.dispatch(reg.actions.setStatus('loading'));
      const res = await reg.gateway.index<Record<string, unknown>[]>(query);
      store.dispatch(reg.actions.setItems(res.data));
      return new ModelCollection<T>(res.data.map((p) => hydrate(this, p) as T));
    } catch (error) {
      return (this as typeof Model).fail(error);
    }
  }

  static async find<T extends Model>(
    this: ModelCtor<T>,
    id: string | number,
  ): Promise<T | null> {
    const reg = (this as typeof Model).reg();
    try {
      const res = await reg.gateway.show<Record<string, unknown>>(id);
      store.dispatch(reg.actions.upsertItem(res.data));
      return hydrate(this, res.data) as T;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      return (this as typeof Model).fail(error);
    }
  }

  async save(): Promise<this> {
    const ctor = this.constructor as typeof Model;
    const reg = ctor.reg();
    const plain = toPlain(this);
    const id = plain[reg.idKey];
    try {
      const res =
        id === undefined || id === null
          ? await reg.gateway.create<Record<string, unknown>>(plain)
          : await reg.gateway.update<Record<string, unknown>>(
              id as string | number,
              plain,
            );
      store.dispatch(reg.actions.upsertItem(res.data));
      Object.assign(this, res.data);
      return this;
    } catch (error) {
      return ctor.fail(error);
    }
  }

  async delete(): Promise<void> {
    const ctor = this.constructor as typeof Model;
    const reg = ctor.reg();
    const id = (toPlain(this) as Record<string, unknown>)[reg.idKey];
    try {
      if (id !== undefined && id !== null) {
        await reg.gateway.destroy(id as string | number);
        store.dispatch(reg.actions.removeItem(id as string | number));
      }
    } catch (error) {
      ctor.fail(error);
    }
  }

  static async call<R>(this: ModelCtor<Model>, config: CallConfig<R>): Promise<R> {
    const reg = (this as typeof Model).reg();
    try {
      const res = await reg.gateway.request<unknown>(config);
      const payload = (config.select ? config.select(res.data) : res.data) as R;
      if (config.store) {
        const merge = config.merge ?? 'replace';
        const rows = (Array.isArray(payload) ? payload : [payload]) as Record<
          string,
          unknown
        >[];
        if (merge === 'replace') store.dispatch(reg.actions.setItems(rows));
        else if (merge === 'upsert') store.dispatch(reg.actions.upsertItems(rows));
        else for (const r of rows) store.dispatch(reg.actions.removeItem(r[reg.idKey] as string | number));
      }
      return payload;
    } catch (error) {
      return (this as typeof Model).fail(error);
    }
  }

  // NOTE: `rxAll`/`rxFind` are React hooks — they call `useAppSelector`/`useEffect`
  // internally, so they MUST be called from a component's render body, per the
  // Rules of Hooks. They return plain reactive snapshots; the fetch side effects
  // run via `useEffect` when the slice status is `idle`.
  static rxAll<T extends Model>(
    this: ModelCtor<T>,
    query?: Record<string, string | number>,
  ): ModelCollection<T> {
    const ctor = this as typeof Model;
    const reg = ctor.reg();
    const slice = useAppSelector(
      (s) => s[reg.sliceName],
    ) as ModelSliceState | undefined;
    const status = slice?.status ?? 'idle';
    const items = slice?.items ?? [];

    useEffect(() => {
      if (status === 'idle') void ctor.all.call(this, query);
    }, [status]);

    return new ModelCollection<T>(
      items.map((p) => hydrate(this, p) as T),
      {
        loading: status === 'idle' || status === 'loading',
        error: slice?.error ?? null,
        refetch: () => void ctor.all.call(this, query),
      },
    );
  }

  static rxFind<T extends Model>(
    this: ModelCtor<T>,
    id: string | number,
  ): T | null {
    const ctor = this as typeof Model;
    const reg = ctor.reg();
    const slice = useAppSelector(
      (s) => s[reg.sliceName],
    ) as ModelSliceState | undefined;
    const status = slice?.status ?? 'idle';
    const found = (slice?.items ?? []).find((p) => p[reg.idKey] === id);

    useEffect(() => {
      if (!found && status === 'idle') void ctor.find.call(this, id);
    }, [status, id]);

    return found ? (hydrate(this, found) as T) : null;
  }
}
