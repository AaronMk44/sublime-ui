import { pathToFileURL } from 'node:url';
import type { PrintFormat, RouteNode } from './model.js';

/**
 * Structural mirrors of the @sublime-ui/ui authoring runtime shapes. We model
 * them locally (rather than importing the runtime's types) so the devkit stays
 * decoupled from the ui package's React-bearing module graph.
 */
interface PageOptionsLike {
  title?: string;
  icon?: string;
  path?: string;
  initial?: boolean;
}
interface PageDefLike {
  kind: 'page';
  component: unknown;
  options?: PageOptionsLike;
}
interface LinkDefLike {
  kind: 'link';
  book: BookDefLike;
  options?: PageOptionsLike;
}
type EntryLike = PageDefLike | LinkDefLike;
interface BookDefLike {
  kind: 'book';
  format: PrintFormat;
  pages: Record<string, EntryLike>;
}

/** A React component's display name; `'Anonymous'` when it has none. */
function componentName(component: unknown): string {
  if (typeof component === 'function' && component.name) return component.name;
  if (
    component != null &&
    typeof component === 'object' &&
    'displayName' in component &&
    typeof (component as { displayName?: unknown }).displayName === 'string'
  ) {
    return (component as { displayName: string }).displayName;
  }
  return 'Anonymous';
}

function isBookDef(value: unknown): value is BookDefLike {
  return (
    value != null &&
    typeof value === 'object' &&
    (value as { kind?: unknown }).kind === 'book' &&
    typeof (value as { pages?: unknown }).pages === 'object'
  );
}

/** Walk an authored `BookDef` into a `RouteNode` book subtree under `key`. */
function bookToNode(def: BookDefLike, key: string, options: PageOptionsLike): RouteNode {
  const children: RouteNode[] = [];
  for (const [childKey, entry] of Object.entries(def.pages)) {
    children.push(entryToNode(entry, childKey));
  }
  return { key, kind: 'book', format: def.format, options: { ...options }, children };
}

function entryToNode(entry: EntryLike, key: string): RouteNode {
  if (entry.kind === 'link') {
    // A link carries its own options (title/icon) but the format and children
    // come from the linked book. Params are lost at runtime → default `void`.
    return bookToNode(entry.book, key, entry.options ?? {});
  }
  return {
    key,
    kind: 'page',
    component: componentName(entry.component),
    options: { ...(entry.options ?? {}) },
  };
}

/**
 * Dynamic-import a compiled storybook module and walk its default-exported
 * `BookDef` into a `RouteNode` tree rooted at `key: 'root'`.
 *
 * Param types are erased by the runtime import (the `page<{ id }>` type argument
 * is phantom), so every page defaults to `void` params; richer param capture is
 * a follow-up via a source scan.
 */
export async function loadStorybook(absFile: string): Promise<RouteNode> {
  const mod = (await import(pathToFileURL(absFile).href)) as { default?: unknown };
  const root = mod.default;
  if (!isBookDef(root)) {
    throw new Error(`Storybook ${absFile} must default-export a book().`);
  }
  return bookToNode(root, 'root', {});
}
