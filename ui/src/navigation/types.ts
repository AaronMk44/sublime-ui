export type MobileFormat = 'drawer' | 'stack' | 'bottomNav';
export type WebFormat = 'sidebar' | 'stack' | 'tabs';
export type PrintFormat = MobileFormat | WebFormat;

export interface PageOptions {
  title?: string;
  icon?: string;
  path?: string;       // web URL segment; defaults to kebab-cased key
  initial?: boolean;
}

export interface PageDef<P = void> {
  readonly kind: 'page';
  readonly component: unknown;        // a React component; typed structurally at author site
  readonly options: PageOptions;
  readonly __params?: P;              // phantom: carries the page's param type
}

export interface LinkDef<RM extends RouteMap = RouteMap> {
  readonly kind: 'link';
  readonly book: BookDef<PrintFormat, RM>;
  readonly options: PageOptions;
}

export type Entry = PageDef<any> | LinkDef<any>;

export type RouteMap = Record<string, unknown>;

export interface BookDef<F extends PrintFormat, RM extends RouteMap> {
  readonly kind: 'book';
  readonly format: F;
  readonly pages: Record<string, Entry>;
  readonly __routes?: RM;             // phantom: flattened route map
}
