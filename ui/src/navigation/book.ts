import type {
  BookDef, Entry, LinkDef, PageDef, PageOptions, PrintFormat, RouteMap,
} from './types';

export function page<P = void>(component: unknown, options: PageOptions = {}): PageDef<P> {
  return { kind: 'page', component, options };
}

export function link<RM extends RouteMap>(
  book: BookDef<PrintFormat, RM>,
  options: PageOptions = {},
): LinkDef<RM> {
  return { kind: 'link', book, options };
}

// Flatten Pages (page params + nested link routes) into one RouteMap at type level.
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type --
   type-level matchers: `any` is the structural wildcard for the conditional checks and
   `{}` is the identity element when a Page is not a LinkDef (intersected away). */
type RoutesOf<Pages extends Record<string, Entry>> =
  { [K in keyof Pages as Pages[K] extends PageDef<any> ? K : never]:
      Pages[K] extends PageDef<infer P> ? P : never }
  & UnionToIntersection<
      { [K in keyof Pages]: Pages[K] extends LinkDef<infer RM> ? RM : {} }[keyof Pages]
    >;

type UnionToIntersection<U> =
  (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type */

export function book<F extends PrintFormat, Pages extends Record<string, Entry>>(
  def: { format: F; pages: Pages },
): BookDef<F, RoutesOf<Pages> & RouteMap> {
  return { kind: 'book', format: def.format, pages: def.pages };
}
