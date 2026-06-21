import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Mock the shipped AppBar so the native NavHeader can be exercised in jsdom
// without loading react-native-paper / react-native. We capture the props the
// header passes down and assert on them.
const appBar = vi.fn((_props: { title: string; onBack?: () => void }) => null);
vi.mock('@sublime-ui/library', () => ({ AppBar: (props: never) => appBar(props) }));

import { NavHeader } from '../../src/navigation/NavHeader.native';

function render(props: unknown): void {
  renderToStaticMarkup(createElement(NavHeader, props as never));
}
function lastProps(): { title: string; onBack?: () => void } {
  return appBar.mock.calls.at(-1)![0];
}

describe('NavHeader (native)', () => {
  beforeEach(() => appBar.mockClear());

  it('uses options.title as the AppBar title', () => {
    render({
      options: { title: 'Todos' },
      route: { name: 'todos' },
      navigation: { goBack: () => {} },
      back: { title: 'Home' },
    });
    expect(lastProps().title).toBe('Todos');
  });

  it('falls back to the route name when no title is set', () => {
    render({ options: {}, route: { name: 'todos' }, navigation: { goBack: () => {} } });
    expect(lastProps().title).toBe('todos');
  });

  it('shows a back action when there is a back target', () => {
    render({
      options: { title: 'Detail' },
      route: { name: 'detail' },
      navigation: { goBack: () => {} },
      back: { title: 'List' },
    });
    expect(lastProps().onBack).toBeTypeOf('function');
  });

  it('omits the back action on a root screen (no back prop)', () => {
    render({ options: { title: 'Home' }, route: { name: 'home' }, navigation: { goBack: () => {} } });
    expect(lastProps().onBack).toBeUndefined();
  });

  it('wires onBack to navigation.goBack', () => {
    const goBack = vi.fn();
    render({
      options: { title: 'Detail' },
      route: { name: 'detail' },
      navigation: { goBack },
      back: { title: 'List' },
    });
    lastProps().onBack!();
    expect(goBack).toHaveBeenCalledOnce();
  });
});
