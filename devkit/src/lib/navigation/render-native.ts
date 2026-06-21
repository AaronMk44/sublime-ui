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

/** The shipped Sublime AppBar header, wired to React Navigation's header slot. */
const HEADER_RENDER = '(props) => <NavHeader {...props} />';

function factoryFor(format: PrintFormat | undefined): { factory: string; nav: string } {
  return NATIVE_FACTORY[format ?? 'stack'] ?? NATIVE_FACTORY.stack!;
}

/** Result of building a screen's `options={{ ... }}` body. */
interface ScreenOptions {
  /** The comma-joined options body (`''` when there is nothing to emit). */
  body: string;
  /** True when the body references `<NavHeader>` (so the file must import it). */
  usesHeader: boolean;
}

/**
 * Build the inner body of a `<Nav.Screen options={{ ... }} />` for one child.
 *
 * Emits `title` (header/tab label) on every navigator and `tabBarIcon` only
 * where the navigator surfaces an icon (tab/drawer). Header rules:
 *  - a nested navigator host (`isBook`) gets `headerShown: false` so only the
 *    inner navigator's AppBar shows (no stacked headers);
 *  - a page hides the AppBar with `header: false` when its navigator shows one;
 *  - a page re-enables the AppBar with `header: true` when its navigator does not.
 */
function screenOptions(
  node: RouteNode,
  supportsIcon: boolean,
  bookShowsHeader: boolean,
  isBook: boolean,
): ScreenOptions {
  const parts: string[] = [];
  let usesHeader = false;
  const { title, icon, header } = node.options;
  if (title !== undefined) parts.push(`title: ${JSON.stringify(title)}`);
  if (icon !== undefined && supportsIcon) {
    // React Navigation's tabBarIcon/drawerIcon is a render function returning a
    // ReactNode; forward the icon name through the generated <NavIcon> so the
    // name stays live, typed data (not a dead comment) the app can theme.
    parts.push(`tabBarIcon: () => <NavIcon name={${JSON.stringify(icon)}} />`);
  }
  if (isBook) {
    parts.push('headerShown: false');
  } else if (bookShowsHeader && header === false) {
    parts.push('headerShown: false');
  } else if (!bookShowsHeader && header === true) {
    parts.push(`header: ${HEADER_RENDER}`);
    usesHeader = true;
  }
  return { body: parts.join(', '), usesHeader };
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
 * into their own generated navigator components.
 *
 * Every navigator renders the shipped Sublime `AppBar` (`NavHeader`) as its
 * header by default — replacing React Navigation's default header — unless its
 * book sets `header: false`. Leaf page components are wrapped in `withNav` so
 * the runtime `useNativeNav()` facade resolves inside a screen (where
 * `useRoute()` is valid); the exported `Navigation` mounts the root navigator
 * directly under `NavigationContainer`.
 */
export function renderNative(root: RouteNode, opts: RenderNativeOptions): string {
  const screenNames = new Set<string>();
  const navigatorBlocks: string[] = [];
  const usedFactories = new Map<string, string>(); // factory → navigator var name
  let usesIcon = false;
  let usesNavHeader = false;

  /** Build (or reuse) a navigator local var for a factory and register its import. */
  const navVarFor = (factory: string, nav: string): string => {
    if (!usedFactories.has(factory)) usedFactories.set(factory, nav);
    return usedFactories.get(factory)!;
  };

  /**
   * Render a book node into a named navigator component, returning that
   * component's name. Page children become `<Nav.Screen>` (wrapped in
   * `withNav`); book children recurse and mount as `<Nav.Screen component={ChildNavigator}>`.
   */
  const renderBook = (book: RouteNode): string => {
    const { factory, nav } = factoryFor(book.format);
    const navVar = navVarFor(factory, nav);
    const componentName = book.key === 'root' ? 'RootNavigator' : `${pascal(book.key)}Navigator`;
    // Only tab/drawer navigators surface a per-screen icon.
    const supportsIcon = factory === 'createBottomTabNavigator' || factory === 'createDrawerNavigator';
    // A book renders the Sublime AppBar by default; `header: false` opts out.
    const bookShowsHeader = book.options.header !== false;
    if (bookShowsHeader) usesNavHeader = true;

    const children = book.children ?? [];

    const screens: string[] = [];
    for (const child of children) {
      const isBook = child.kind === 'book';
      const name = isBook ? renderBook(child) : (child.component ?? pascal(child.key));
      // Leaf pages are wrapped so the nav facade resolves inside a screen.
      const componentExpr = isBook ? name : `withNav(${name})`;
      if (!isBook) screenNames.add(name);

      if (supportsIcon && child.options.icon !== undefined) usesIcon = true;
      const { body, usesHeader } = screenOptions(child, supportsIcon, bookShowsHeader, isBook);
      if (usesHeader) usesNavHeader = true;
      const optionsAttr = body ? ` options={{ ${body} }}` : '';
      screens.push(
        `      <${navVar}.Screen name="${child.key}" component={${componentExpr}}${optionsAttr} />`,
      );
    }

    // `initial: true` selects the navigator's starting route (defaults to first).
    const initialChild = children.find((c) => c.options.initial === true);
    const initialAttr = initialChild ? ` initialRouteName="${initialChild.key}"` : '';
    const screenOptsObj = bookShowsHeader ? `header: ${HEADER_RENDER}` : 'headerShown: false';
    const navProps = `${initialAttr} screenOptions={{ ${screenOptsObj} }}`;

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

  // The Sublime AppBar header (NavHeader) and the nav facade (NavProvider) both
  // come from the navigation subpath barrel; import NavHeader only when used.
  const navUiNames = usesNavHeader ? 'NavHeader, NavProvider' : 'NavProvider';

  return (
    `${header}\n` +
    `import type { ComponentType, ReactNode } from 'react';\n` +
    `import { NavigationContainer } from '@react-navigation/native';\n` +
    `${factoryImports}\n` +
    `import { ${navUiNames} } from '@sublime-ui/ui/navigation';\n` +
    `import { useNativeNav } from '@sublime-ui/ui/navigation/bridge.native';\n` +
    `import { ${screenImport} } from '${opts.screensImport}';\n` +
    `\n` +
    `${navIconBlock}` +
    `${navigatorBlocks.join('\n\n')}\n` +
    `\n` +
    `function withNav<P extends object>(Component: ComponentType<P>): ComponentType<P> {\n` +
    `  return function NavBridge(props: P): ReactNode {\n` +
    `    const nav = useNativeNav();\n` +
    `    return (\n` +
    `      <NavProvider value={nav}>\n` +
    `        <Component {...props} />\n` +
    `      </NavProvider>\n` +
    `    );\n` +
    `  };\n` +
    `}\n` +
    `\n` +
    `export function Navigation() {\n` +
    `  return (\n` +
    `    <NavigationContainer>\n` +
    `      <${rootComponent} />\n` +
    `    </NavigationContainer>\n` +
    `  );\n` +
    `}\n`
  );
}
