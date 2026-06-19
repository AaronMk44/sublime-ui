import type { PrintFormat, RouteNode } from './model.js';

export interface Diagnostic {
  level: 'error';
  rule: string;
  message: string;
}

const MOBILE_FORMATS = new Set<PrintFormat>(['drawer', 'stack', 'bottomNav']);
const WEB_FORMATS = new Set<PrintFormat>(['sidebar', 'stack', 'tabs']);

/**
 * Walk a storybook tree and collect diagnostics. Rules:
 * - `format-platform`: a book's `format` is not valid for the target platform.
 * - `bottomNav-max-5`: a `bottomNav` book has more than 5 direct page children.
 * - `duplicate-key`: the same page key appears more than once across the tree.
 * - `dangling`: a page has no component / a link or book has no children.
 * - `multiple-initial`: a book has more than one child with `initial: true`.
 * - `bad-link`: a `link()` does not reference a `book()` (flagged by load-storybook).
 */
export function validate(root: RouteNode, platform: 'mobile' | 'web'): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const formats = platform === 'mobile' ? MOBILE_FORMATS : WEB_FORMATS;
  const keyCounts = new Map<string, number>();

  const error = (rule: string, message: string): void => {
    diagnostics.push({ level: 'error', rule, message });
  };

  const walk = (node: RouteNode, isRoot: boolean): void => {
    // The synthetic root book key ('root') is not part of the authored
    // navigation namespace, so it must not collide with a user page named
    // 'root' nor flag itself as a duplicate.
    if (!isRoot) {
      keyCounts.set(node.key, (keyCounts.get(node.key) ?? 0) + 1);
    }

    if (node.kind === 'page') {
      if (!node.component) {
        error('dangling', `Page "${node.key}" has no component.`);
      }
      return;
    }

    // book
    const children = node.children ?? [];

    if (node.linkError !== undefined) {
      error(
        'bad-link',
        `Book "${node.key}": ${node.linkError} Fix: pass a value returned by book() to link().`,
      );
      // A bad link has no usable subtree; skip its other book rules.
      return;
    }

    if (children.length === 0) {
      error('dangling', `Book "${node.key}" has no children.`);
    }

    if (node.format && !formats.has(node.format)) {
      error(
        'format-platform',
        `Book "${node.key}" uses format "${node.format}" which is not valid on ${platform}.`,
      );
    }

    if (node.format === 'bottomNav') {
      const directPages = children.filter((c) => c.kind === 'page').length;
      if (directPages > 5) {
        error(
          'bottomNav-max-5',
          `Book "${node.key}" has ${directPages} bottomNav pages; the maximum is 5.`,
        );
      }
    }

    const initialCount = children.filter((c) => c.options.initial === true).length;
    if (initialCount > 1) {
      error(
        'multiple-initial',
        `Book "${node.key}" has ${initialCount} children marked initial; only one is allowed.`,
      );
    }

    for (const child of children) {
      walk(child, false);
    }
  };

  walk(root, true);

  for (const [key, count] of keyCounts) {
    if (count > 1) {
      error('duplicate-key', `Key "${key}" is used ${count} times across the tree.`);
    }
  }

  return diagnostics;
}
