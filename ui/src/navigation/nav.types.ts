import type { RouteMap } from './types';

export interface Nav {
  turnTo(name: string, params?: unknown): void;
  turnBack(): void;
  current(): string;
  params<T = unknown>(): T;
}

type NoParams<P> = [P] extends [void] ? true : P extends undefined ? true : false;

export interface TypedNav<RM extends RouteMap> {
  turnTo<K extends keyof RM & string>(
    ...args: NoParams<RM[K]> extends true ? [name: K] : [name: K, params: RM[K]]
  ): void;
  turnBack(): void;
  current(): keyof RM & string;
  params<K extends keyof RM & string>(): RM[K];
}
