import type { PrintFormat, RouteNode } from './model.js';

export interface RenderNativeOptions {
  /** Import specifier the generated file pulls screen components from. */
  screensImport: string;
}

/** Map a book `format` to its React Navigation factory + local navigator name. */
const NATIVE_FACTORY: Record<string, { factory: string; nav: string }> = {
  bottomNav: { factory: 'createBottomTabNavigator', nav: 'Tab' },
  drawer: { factory: 'createDrawerNavigator', nav: 'Drawer' },
  stack: { factory: 'createNativeStackNavigator', nav: 'Stack' },
};

const FACTORY_MODULE: Record<string, string> = {
  createBottomTabNavigator: '@react-navigation/bottom-tabs',
  createDrawerNavigator: '@react-navigation/drawer',
  createNativeStackNavigator: '@react-navigation/native-stack',
};

function factoryFor(format: PrintFormat | undefined): { factory: string; nav: string } {
  return NATIVE_FACTORY[format ?? 'stack'] ?? NATIVE_FACTORY.stack!;
}

/**
 * Build the inner body of a `<Nav.Screen options={{ ... }} />` from a node's
 * `PageOptions`. Emits `title` (header/tab label) on every navigator and
 * `tabBarIcon` only where the navigator surfaces an icon (tab/drawer). Returns
 * `''` when there is nothing to emit (caller then omits the `options` attr).
 */
function screenOptions(node: RouteNode, supportsIcon: boolean): string {
  const parts: string[] = [];
  const { title, icon } = node.options;
  if (title !== undefined) parts.push(`title: ${JSON.stringify(title)}`);
  if (icon !== undefined && supportsIcon) {
    // React Navigation's tabBarIcon/drawerIcon is a render function returning a
    // ReactNode; forward the icon name through the generated <NavIcon> so the
    // name stays live, typed data (not a dead comment) the app can theme.
    parts.push(`tabBarIcon: () => <NavIcon name={${JSON.stringify(icon)}} />`);
  }
  return parts.join(', ');
}

/** PascalCase a route key into a generated navigator component name. */
function pascal(key: string): string {
  return key
    .replace(/[_\s-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

/**
 * Emit a `navigation.native.tsx` source string from a storybook `RouteNode`
 * tree. Each `book` becomes a React Navigation navigator (factory chosen by
 * `format`); each `page` becomes a `<Nav.Screen>`. Nested linked books recurse
 * into their own generated navigator components. The exported `Navigation`
 * component wraps everything in `NavigationContainer` and bridges the runtime
 * `useNativeNav()` through `<NavProvider>`.
 */
export function renderNative(root: RouteNode, opts: RenderNativeOptions): string {
  const screenNames = new Set<string>();
  const navigatorBlocks: string[] = [];
  const usedFactories = new Map<string, string>(); // factory → navigator var name
  let usesIcon = false;

  /** Build (or reuse) a navigator local var for a factory and register its import. */
  const navVarFor = (factory: string, nav: string): string => {
    if (!usedFactories.has(factory)) usedFactories.set(factory, nav);
    return usedFactories.get(factory)!;
  };

  /**
   * Render a book node into a named navigator component, returning that
   * component's name. Page children become `<Nav.Screen>`; book children
   * recurse and are mounted as a `<Nav.Screen component={ChildNavigator}>`.
   */
  const renderBook = (book: RouteNode): string => {
    const { factory, nav } = factoryFor(book.format);
    const navVar = navVarFor(factory, nav);
    const componentName = book.key === 'root' ? 'RootNavigator' : `${pascal(book.key)}Navigator`;
    // Only tab/drawer navigators surface a per-screen icon.
    const supportsIcon = factory === 'createBottomTabNavigator' || factory === 'createDrawerNavigator';

    const children = book.children ?? [];

    const screens: string[] = [];
    for (const child of children) {
      const name = child.kind === 'page' ? (child.component ?? pascal(child.key)) : renderBook(child);
      if (child.kind === 'page') screenNames.add(name);

      if (supportsIcon && child.options.icon !== undefined) usesIcon = true;
      const options = screenOptions(child, supportsIcon);
      const optionsAttr = options ? ` options={{ ${options} }}` : '';
      screens.push(
        `      <${navVar}.Screen name="${child.key}" component={${name}}${optionsAttr} />`,
      );
    }

    // `initial: true` selects the navigator's starting route (defaults to first).
    const initialChild = children.find((c) => c.options.initial === true);
    const navProps = initialChild ? ` initialRouteName="${initialChild.key}"` : '';

    navigatorBlocks.push(
      `function ${componentName}() {\n` +
        `  return (\n` +
        `    <${navVar}.Navigator${navProps}>\n` +
        `${screens.join('\n')}\n` +
        `    </${navVar}.Navigator>\n` +
        `  );\n` +
        `}`,
    );

    return componentName;
  };

  const rootComponent = renderBook(root);

  const factoryImports = [...usedFactories.entries()]
    .map(([factory, nav]) => {
      const mod = FACTORY_MODULE[factory]!;
      return `import { ${factory} } from '${mod}';\nconst ${nav} = ${factory}();`;
    })
    .join('\n');

  const screenImport = [...screenNames].sort().join(', ');

  const header = '// AUTO-GENERATED by sublime build:nav — do not edit';

  // Generated icon helper: forwards a tab/drawer icon name as live, typed data.
  // Apps replace/extend this to map names to glyphs; default renders nothing.
  const navIconBlock = usesIcon
    ? `function NavIcon(_props: { name: string }): ReactNode {\n` +
      `  return null;\n` +
      `}\n\n`
    : '';

  return (
    `${header}\n` +
    `import type { ReactNode } from 'react';\n` +
    `import { NavigationContainer } from '@react-navigation/native';\n` +
    `${factoryImports}\n` +
    `import { NavProvider } from '@sublime-ui/ui/navigation';\n` +
    `import { useNativeNav } from '@sublime-ui/ui/navigation/bridge.native';\n` +
    `import { ${screenImport} } from '${opts.screensImport}';\n` +
    `\n` +
    `${navIconBlock}` +
    `${navigatorBlocks.join('\n\n')}\n` +
    `\n` +
    `function NavBridge({ children }: { children: ReactNode }) {\n` +
    `  const nav = useNativeNav();\n` +
    `  return <NavProvider value={nav}>{children}</NavProvider>;\n` +
    `}\n` +
    `\n` +
    `export function Navigation() {\n` +
    `  return (\n` +
    `    <NavigationContainer>\n` +
    `      <NavBridge>\n` +
    `        <${rootComponent} />\n` +
    `      </NavBridge>\n` +
    `    </NavigationContainer>\n` +
    `  );\n` +
    `}\n`
  );
}
