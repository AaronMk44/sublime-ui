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

  it('imports NavProvider from the navigation subpath barrel', () => {
    const out = renderNative(tree as any, { screensImport: './screens' });
    expect(out).toContain("import { NavProvider } from '@sublime-ui/ui/navigation';");
    // NavProvider is NOT exported from the root entry.
    expect(out).not.toContain("from '@sublime-ui/ui';");
  });

  it('imports useNativeNav directly from the platform bridge module', () => {
    const out = renderNative(tree as any, { screensImport: './screens' });
    expect(out).toContain(
      "import { useNativeNav } from '@sublime-ui/ui/navigation/bridge.native';",
    );
  });

  it('imports ReactNode explicitly instead of referencing the global React namespace', () => {
    const out = renderNative(tree as any, { screensImport: './screens' });
    expect(out).toContain("import type { ReactNode } from 'react';");
    expect(out).not.toContain('React.ReactNode');
  });
});
