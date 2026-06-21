import { describe, it, expect } from 'vitest';
import { renderNative } from '../../src/lib/navigation/render-native';

const tree = {
  key: 'root', kind: 'book', format: 'bottomNav', options: {},
  children: [
    { key: 'home', kind: 'page', component: 'Home', options: {} },
    { key: 'settings', kind: 'book', format: 'stack', options: {}, children: [
      { key: 'profile', kind: 'page', component: 'Profile', options: {} },
    ] },
  ],
} as const;

describe('renderNative', () => {
  it('emits a bottomNav navigator with screens and a NavigationContainer', () => {
    const out = renderNative(tree as any, { screensImport: './screens' });
    expect(out).toContain('createBottomTabNavigator');
    expect(out).toContain('<Tab.Screen name="home"');
    expect(out).toContain('NavigationContainer');
  });

  it('emits a nested stack navigator for a linked stack book', () => {
    const out = renderNative(tree as any, { screensImport: './screens' });
    expect(out).toContain('createNativeStackNavigator');
  });

  it('wires NavProvider through useNativeNav', () => {
    const out = renderNative(tree as any, { screensImport: './screens' });
    expect(out).toContain('NavProvider');
    expect(out).toContain('useNativeNav');
  });

  it('imports NavHeader + NavProvider from the navigation subpath barrel', () => {
    const out = renderNative(tree as any, { screensImport: './screens' });
    expect(out).toContain("import { NavHeader, NavProvider } from '@sublime-ui/ui/navigation';");
    // The nav APIs are NOT exported from the root entry.
    expect(out).not.toContain("from '@sublime-ui/ui';");
  });

  it('renders the Sublime AppBar (NavHeader) as the default navigator header', () => {
    const out = renderNative(tree as any, { screensImport: './screens' });
    expect(out).toContain('screenOptions={{ header: (props) => <NavHeader {...props} /> }}');
  });

  it('wraps leaf page components in withNav (per-screen nav facade)', () => {
    const out = renderNative(tree as any, { screensImport: './screens' });
    expect(out).toContain('function withNav<P extends object>');
    expect(out).toContain('component={withNav(Home)}');
    // Nested navigators are mounted directly, not wrapped.
    expect(out).toContain('component={SettingsNavigator}');
  });

  it('mounts the root navigator directly under NavigationContainer (no container-level NavBridge)', () => {
    const out = renderNative(tree as any, { screensImport: './screens' });
    expect(out).toContain('<NavigationContainer>\n      <RootNavigator />\n    </NavigationContainer>');
    expect(out).not.toContain('<NavBridge>');
  });

  it('hides the host header for a nested navigator screen (no stacked AppBars)', () => {
    const out = renderNative(tree as any, { screensImport: './screens' });
    expect(out).toContain('<Tab.Screen name="settings" component={SettingsNavigator} options={{ headerShown: false }} />');
  });

  it('emits headerShown:false for a page that opts out with header:false', () => {
    const noHeaderTree = {
      key: 'root', kind: 'book', format: 'stack', options: {},
      children: [
        { key: 'home', kind: 'page', component: 'Home', options: { title: 'Home', header: false } },
      ],
    } as const;
    const out = renderNative(noHeaderTree as any, { screensImport: './screens' });
    expect(out).toContain('options={{ title: "Home", headerShown: false }}');
  });

  it('disables the header for a whole book with book-level header:false', () => {
    const bookOff = {
      key: 'root', kind: 'book', format: 'stack', options: { header: false },
      children: [{ key: 'home', kind: 'page', component: 'Home', options: {} }],
    } as const;
    const out = renderNative(bookOff as any, { screensImport: './screens' });
    expect(out).toContain('screenOptions={{ headerShown: false }}');
    // NavHeader is unused, so it is not imported.
    expect(out).toContain("import { NavProvider } from '@sublime-ui/ui/navigation';");
    expect(out).not.toContain('NavHeader');
  });

  it('imports useNativeNav directly from the platform bridge module', () => {
    const out = renderNative(tree as any, { screensImport: './screens' });
    expect(out).toContain(
      "import { useNativeNav } from '@sublime-ui/ui/navigation/bridge.native';",
    );
  });

  it('imports ReactNode explicitly instead of referencing the global React namespace', () => {
    const out = renderNative(tree as any, { screensImport: './screens' });
    expect(out).toContain("import type { ComponentType, ReactNode } from 'react';");
    expect(out).not.toContain('React.ReactNode');
  });

  const optioned = {
    key: 'root', kind: 'book', format: 'bottomNav', options: {},
    children: [
      { key: 'home', kind: 'page', component: 'Home', options: { title: 'Home', icon: 'house' } },
      { key: 'product', kind: 'page', component: 'Product', options: { title: 'Product', initial: true } },
    ],
  } as const;

  it('emits the page title as the screen options.title label', () => {
    const out = renderNative(optioned as any, { screensImport: './screens' });
    expect(out).toContain('options={{ title: "Home"');
  });

  it('emits the page icon for a tab navigator screen', () => {
    const out = renderNative(optioned as any, { screensImport: './screens' });
    expect(out).toContain('tabBarIcon');
    expect(out).toContain('"house"');
  });

  it('drives initialRouteName from the initial page option', () => {
    const out = renderNative(optioned as any, { screensImport: './screens' });
    expect(out).toContain('initialRouteName="product"');
  });
});
