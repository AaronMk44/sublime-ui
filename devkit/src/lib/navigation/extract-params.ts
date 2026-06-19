import ts from 'typescript';

/**
 * Scan a storybook source file and capture the explicit param type argument of
 * each `page<...>()` call, keyed by the `pages` property name the call is
 * assigned to.
 *
 * Runtime import erases the `page<{ id: number }>(...)` type argument (it is a
 * phantom generic), so param types must be recovered from source. We parse the
 * file with the TypeScript compiler API and, for every property assignment whose
 * initializer is a `page<T>(...)` call carrying an explicit type argument, record
 * `key → "<verbatim T>"`. Keys whose `page()` call has no type argument are
 * omitted (the caller defaults them to `void`); `link()` entries are ignored.
 *
 * Keys are the global navigation namespace (duplicate page keys are a validation
 * error), so a flat `Map` keyed by property name is sufficient and matches the
 * route keys `flatten` produces.
 *
 * @param source raw TypeScript source of a `storybook.{native,web}.ts` file.
 * @returns a map of page key → TS type-argument string (e.g. `{ id: number }`).
 */
export function extractParams(source: string): Map<string, string> {
  const sf = ts.createSourceFile('storybook.ts', source, ts.ScriptTarget.Latest, true);
  const params = new Map<string, string>();

  const visit = (node: ts.Node): void => {
    // A `pages` entry is a property assignment `key: page<T>(...)`.
    if (
      ts.isPropertyAssignment(node) &&
      ts.isCallExpression(node.initializer) &&
      isPageCall(node.initializer) &&
      node.initializer.typeArguments &&
      node.initializer.typeArguments.length > 0
    ) {
      const key = propertyName(node.name);
      if (key !== undefined) {
        params.set(key, node.initializer.typeArguments[0]!.getText(sf).trim());
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  return params;
}

/** True when a call expression is `page(...)` (the authoring helper). */
function isPageCall(call: ts.CallExpression): boolean {
  return ts.isIdentifier(call.expression) && call.expression.text === 'page';
}

/** The literal text of a property name, or `undefined` for computed names. */
function propertyName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return undefined;
}
