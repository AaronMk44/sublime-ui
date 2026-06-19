import { readFileSync } from 'node:fs';
import ts from 'typescript';
import type { PageOptions, PrintFormat, RouteNode } from './model.js';

/**
 * Statically analyze a storybook source file into a `RouteNode` tree.
 *
 * Unlike a runtime loader, this never `import()`s or executes the storybook (nor
 * the screen modules it imports), so it works for production storybooks that
 * import `.tsx` screens or `react-native` (which Node cannot load). We parse the
 * file with the TypeScript compiler API and walk the default-exported `book(...)`
 * call expression, reading structure and identifier names only — page components
 * are recorded as their identifier TEXT, not resolved to live functions.
 *
 * The produced tree is shape-identical to what the old runtime loader emitted:
 * a root `book` under `key: 'root'`, with `page` and (resolved) `book` children.
 * `link(<Ident>)` entries are resolved to a LOCAL `const <Ident> = book({...})`
 * in the same file; a link whose target is not a local `book()` is carried as a
 * `linkError` node (matching the runtime loader) so `validate` reports a clean
 * `bad-link` diagnostic rather than throwing.
 *
 * Note: only same-file `const x = book(...)` links are resolved. A `link()` whose
 * target is an IMPORTED `book()` from another file is not followed (we never load
 * other modules) and resolves to a `linkError`.
 *
 * @param absFile absolute path to a `storybook.{native,web}.ts` file.
 * @returns the analyzed `RouteNode` tree rooted at `key: 'root'`.
 */
export function analyzeStorybook(absFile: string): RouteNode {
  const source = readFileSync(absFile, 'utf8');
  const sf = ts.createSourceFile(absFile, source, ts.ScriptTarget.Latest, true);

  // Index local `const <name> = book({...})` declarations so link() targets (and
  // a `default`-exported book const) can be resolved by identifier without
  // executing anything.
  const localBooks = collectLocalBooks(sf);

  const rootCall = findDefaultBookCall(sf, localBooks);
  if (rootCall === undefined) {
    throw new Error(`Storybook ${absFile} must default-export a book().`);
  }

  return bookToNode(rootCall, 'root', {}, sf, localBooks);
}

/** Local `const <name> = book({...})` declarations, indexed by identifier name. */
type LocalBooks = Map<string, ts.CallExpression>;

/** Walk a `book({ format, pages })` call into a `RouteNode` book subtree. */
function bookToNode(
  call: ts.CallExpression,
  key: string,
  options: PageOptions,
  sf: ts.SourceFile,
  localBooks: LocalBooks,
): RouteNode {
  const arg = call.arguments[0];
  const config =
    arg !== undefined && ts.isObjectLiteralExpression(arg) ? arg : undefined;

  const format = config ? stringProp(config, 'format') : undefined;
  const pages = config ? objectProp(config, 'pages') : undefined;

  const children: RouteNode[] = [];
  if (pages) {
    for (const prop of pages.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      const childKey = propertyName(prop.name);
      if (childKey === undefined) continue;
      if (!ts.isCallExpression(prop.initializer)) continue;
      children.push(entryToNode(prop.initializer, childKey, sf, localBooks));
    }
  }

  const node: RouteNode = { key, kind: 'book', options: { ...options }, children };
  if (format !== undefined) node.format = format as PrintFormat;
  return node;
}

/** Convert a single `pages` entry call (`page(...)` / `link(...)`) to a node. */
function entryToNode(
  call: ts.CallExpression,
  key: string,
  sf: ts.SourceFile,
  localBooks: LocalBooks,
): RouteNode {
  const callee = ts.isIdentifier(call.expression) ? call.expression.text : undefined;

  if (callee === 'link') {
    const options = optionsFromCall(call, 1);
    const target = call.arguments[0];
    const targetName =
      target !== undefined && ts.isIdentifier(target) ? target.text : undefined;
    const targetBook = targetName !== undefined ? localBooks.get(targetName) : undefined;
    if (targetBook === undefined) {
      // The link does not reference a local book() — carry it as a linkError so
      // `validate` reports a clean `bad-link` diagnostic (mirrors the runtime
      // loader's behavior for `!isBookDef(entry.book)`).
      return {
        key,
        kind: 'book',
        options,
        children: [],
        linkError: `link("${key}") does not reference a book().`,
      };
    }
    return bookToNode(targetBook, key, options, sf, localBooks);
  }

  // Default: treat as a `page(...)` (or `page<...>(...)`) entry. The component is
  // the identifier TEXT of the first argument — never resolved/executed.
  const options = optionsFromCall(call, 1);
  const component = call.arguments[0];
  const componentName =
    component !== undefined && ts.isIdentifier(component) ? component.text : undefined;
  const node: RouteNode = { key, kind: 'page', options };
  if (componentName !== undefined) node.component = componentName;
  return node;
}

/** Read a `page`/`link` options object literal at `argIndex` into PageOptions. */
function optionsFromCall(call: ts.CallExpression, argIndex: number): PageOptions {
  const arg = call.arguments[argIndex];
  if (arg === undefined || !ts.isObjectLiteralExpression(arg)) return {};
  const options: PageOptions = {};
  const title = stringProp(arg, 'title');
  if (title !== undefined) options.title = title;
  const icon = stringProp(arg, 'icon');
  if (icon !== undefined) options.icon = icon;
  const path = stringProp(arg, 'path');
  if (path !== undefined) options.path = path;
  const initial = booleanProp(arg, 'initial');
  if (initial !== undefined) options.initial = initial;
  return options;
}

/**
 * Find the default-exported `book(...)` call expression, supporting both
 * `export default book({...})` and a `default` export of a `book(...)` const.
 */
function findDefaultBookCall(
  sf: ts.SourceFile,
  localBooks: LocalBooks,
): ts.CallExpression | undefined {
  let found: ts.CallExpression | undefined;

  for (const stmt of sf.statements) {
    if (ts.isExportAssignment(stmt) && !stmt.isExportEquals) {
      const expr = stmt.expression;
      if (ts.isCallExpression(expr) && isBookCall(expr)) {
        found = expr;
      } else if (ts.isIdentifier(expr)) {
        // `export default someConst;` where someConst = book({...})
        const local = localBooks.get(expr.text);
        if (local) found = local;
      }
    }
  }

  return found;
}

/** True when a call expression is `book(...)` (the authoring helper). */
function isBookCall(call: ts.CallExpression): boolean {
  return ts.isIdentifier(call.expression) && call.expression.text === 'book';
}

/** Index top-level `const <name> = book({...})` declarations by name. */
function collectLocalBooks(sf: ts.SourceFile): LocalBooks {
  const books: LocalBooks = new Map();
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer !== undefined &&
      ts.isCallExpression(node.initializer) &&
      isBookCall(node.initializer)
    ) {
      books.set(node.name.text, node.initializer);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return books;
}

/** A string-literal property value of an object literal, or undefined. */
function stringProp(obj: ts.ObjectLiteralExpression, name: string): string | undefined {
  const init = propInitializer(obj, name);
  if (init && ts.isStringLiteralLike(init)) return init.text;
  return undefined;
}

/** A boolean-literal property value of an object literal, or undefined. */
function booleanProp(obj: ts.ObjectLiteralExpression, name: string): boolean | undefined {
  const init = propInitializer(obj, name);
  if (init?.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (init?.kind === ts.SyntaxKind.FalseKeyword) return false;
  return undefined;
}

/** An object-literal property value of an object literal, or undefined. */
function objectProp(
  obj: ts.ObjectLiteralExpression,
  name: string,
): ts.ObjectLiteralExpression | undefined {
  const init = propInitializer(obj, name);
  if (init && ts.isObjectLiteralExpression(init)) return init;
  return undefined;
}

/** The initializer expression of a named property assignment, or undefined. */
function propInitializer(
  obj: ts.ObjectLiteralExpression,
  name: string,
): ts.Expression | undefined {
  for (const prop of obj.properties) {
    if (ts.isPropertyAssignment(prop) && propertyName(prop.name) === name) {
      return prop.initializer;
    }
  }
  return undefined;
}

/** The literal text of a property name, or `undefined` for computed names. */
function propertyName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return undefined;
}
