import type { RouteNode } from './model.js';

export interface FlatRoute {
  key: string;
  path: string;
  hasParams: boolean;
}

export interface FlattenResult {
  routes: FlatRoute[];
}

/** kebab-case a route key (camelCase / PascalCase / snake_case → kebab). */
function kebab(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

/** A path segment has params when it contains a `:param` placeholder. */
function segmentHasParams(segment: string): boolean {
  return segment.includes(':');
}

/**
 * Flatten a book tree into a flat route table via depth-first traversal.
 * Each leaf `page` becomes a route whose `path` is the concatenation of its
 * ancestor book prefixes plus its own segment (`options.path` ?? kebab(key)).
 */
export function flatten(root: RouteNode): FlattenResult {
  const routes: FlatRoute[] = [];

  const walk = (node: RouteNode, prefix: string, isRoot: boolean): void => {
    if (node.kind === 'page') {
      const segment = node.options.path ?? kebab(node.key);
      const path = `${prefix}/${segment}`;
      routes.push({ key: node.key, path, hasParams: segmentHasParams(path) });
      return;
    }

    // book: contributes a prefix segment for its children, except the root book
    // (the root book is the container itself and is not part of the URL).
    const segment = node.options.path ?? kebab(node.key);
    const nextPrefix = isRoot ? prefix : `${prefix}/${segment}`;
    for (const child of node.children ?? []) {
      walk(child, nextPrefix, false);
    }
  };

  walk(root, '', true);

  return { routes };
}
