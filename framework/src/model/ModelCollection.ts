import type { ApiError } from '../gateway/ApiError.js';

export interface CollectionMeta {
  loading: boolean;
  error: ApiError | null;
  refetch: () => void;
}

export class ModelCollection<T> implements Iterable<T> {
  readonly items: T[];
  readonly loading: boolean;
  readonly error: ApiError | null;
  readonly refetch: () => void;

  constructor(items: T[], meta: Partial<CollectionMeta> = {}) {
    this.items = items;
    this.loading = meta.loading ?? false;
    this.error = meta.error ?? null;
    this.refetch = meta.refetch ?? ((): void => {});
  }

  get length(): number {
    return this.items.length;
  }

  private withItems(items: T[]): ModelCollection<T> {
    return new ModelCollection<T>(items, {
      loading: this.loading,
      error: this.error,
      refetch: this.refetch,
    });
  }

  where<K extends keyof T>(key: K, value: T[K]): ModelCollection<T> {
    return this.withItems(this.items.filter((item) => item[key] === value));
  }

  whereIn<K extends keyof T>(key: K, values: T[K][]): ModelCollection<T> {
    return this.withItems(this.items.filter((item) => values.includes(item[key])));
  }

  sortBy<K extends keyof T>(key: K): ModelCollection<T> {
    const sorted = [...this.items].sort((a, b) =>
      a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0,
    );
    return this.withItems(sorted);
  }

  find(predicate: (item: T) => boolean): T | undefined {
    return this.items.find(predicate);
  }

  first(): T | undefined {
    return this.items[0];
  }

  map<U>(fn: (item: T, i: number) => U): U[] {
    return this.items.map(fn);
  }

  filter(fn: (item: T, i: number) => boolean): ModelCollection<T> {
    return this.withItems(this.items.filter(fn));
  }

  toArray(): T[] {
    return [...this.items];
  }

  [Symbol.iterator](): Iterator<T> {
    return this.items[Symbol.iterator]();
  }
}
