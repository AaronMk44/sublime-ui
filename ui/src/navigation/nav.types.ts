export interface Nav {
  turnTo(name: string, params?: unknown): void;
  turnBack(): void;
  current(): string;
  params<T = unknown>(): T;
}

type NoParams<P> = [P] extends [void] ? true : P extends undefined ? true : false;

// `RM extends object` (not `Record<string, unknown>`) so a generated `interface
// AppRoutes { ... }` satisfies it. TypeScript interfaces lack an implicit index
// signature and so do NOT extend `Record<string, unknown>`, but the route map is
// always a concrete object type here, and `keyof`/indexing work on either.
export interface TypedNav<RM extends object> {
  turnTo<K extends keyof RM & string>(
    ...args: NoParams<RM[K]> extends true ? [name: K] : [name: K, params: RM[K]]
  ): void;
  turnBack(): void;
  current(): keyof RM & string;
  params<K extends keyof RM & string>(): RM[K];
}
