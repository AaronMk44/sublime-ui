import type { RouteParam } from './render-routes-dts.js';

export interface MergeRouteParamsInput {
  /** Flattened route keys from the native storybook tree. */
  nativeKeys: readonly string[];
  /** Flattened route keys from the web storybook tree. */
  webKeys: readonly string[];
  /** Per-key param type strings captured from the native source. */
  nativeParams: ReadonlyMap<string, string>;
  /** Per-key param type strings captured from the web source. */
  webParams: ReadonlyMap<string, string>;
}

export interface MergeRouteParamsResult {
  /** Unioned route map (sorted by key), each route's param type or `void`. */
  routes: RouteParam[];
  /** Keys present on both platforms with disagreeing explicit param types. */
  conflicts: string[];
}

/**
 * Union the route keys of both platforms into one `AppRoutes` route map.
 *
 * Per spec §2.4/§10 each platform may have its own pages, so the generated
 * `routes.d.ts` must cover keys reachable on *either* platform. A key's param
 * type is the explicit `page<...>()` type argument captured from source; when
 * only one platform declares it, that type wins; when neither does, it defaults
 * to `void`. If both platforms declare the same key with *different* explicit
 * types the route is ambiguous — it is reported in `conflicts` so the build can
 * fail with a clear diagnostic rather than silently picking one.
 */
export function mergeRouteParams(input: MergeRouteParamsInput): MergeRouteParamsResult {
  const { nativeKeys, webKeys, nativeParams, webParams } = input;

  const keys = [...new Set([...nativeKeys, ...webKeys])].sort();
  const routes: RouteParam[] = [];
  const conflicts: string[] = [];

  for (const key of keys) {
    const nativeType = nativeParams.get(key);
    const webType = webParams.get(key);

    if (nativeType !== undefined && webType !== undefined && nativeType !== webType) {
      conflicts.push(key);
    }

    routes.push({ key, params: nativeType ?? webType ?? 'void' });
  }

  return { routes, conflicts };
}
