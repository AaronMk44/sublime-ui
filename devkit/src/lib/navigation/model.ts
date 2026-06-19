export type MobileFormat = 'drawer' | 'stack' | 'bottomNav';
export type WebFormat = 'sidebar' | 'stack' | 'tabs';
export type PrintFormat = MobileFormat | WebFormat;

export interface PageOptions {
  title?: string;
  icon?: string;
  path?: string; // web URL segment; defaults to kebab-cased key
  initial?: boolean;
}

/**
 * An analyzed storybook node, built by `load-storybook`. A `book` carries a
 * `format` and `children`; a `page` carries a `component`.
 */
export interface RouteNode {
  key: string;
  kind: 'page' | 'book';
  format?: PrintFormat;
  component?: string;
  options: PageOptions;
  children?: RouteNode[];
  /**
   * Set by `load-storybook` when a `link()` does not reference a valid `book()`.
   * Carried as data (rather than thrown) so `validate` can report it as a clean
   * `bad-link` diagnostic alongside the other rules.
   */
  linkError?: string;
}
