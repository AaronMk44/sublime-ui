import { NavProvider, useNav } from '../../src/navigation';

// A concrete generated `AppRoutes` (what `build:nav` emits into `routes.d.ts`):
// `home` takes no params (void); `product` carries `{ id: number }`.
type AppRoutes = {
  home: void;
  product: { id: number };
};

// `useNav` is a hook; exercise its typed surface inside a component body. The
// call is never executed — vitest's `--typecheck` only type-checks this file.
function _useTurnTo() {
  const nav = useNav<AppRoutes>();

  // A param route requires its params object.
  nav.turnTo('product', { id: 1 });

  // A void route takes only the name.
  nav.turnTo('home');

  // @ts-expect-error - 'product' requires a params argument
  nav.turnTo('product');

  // @ts-expect-error - 'nope' is not a route in AppRoutes
  nav.turnTo('nope');
}

// Reference the bridged provider so the import is not flagged unused.
void NavProvider;
void _useTurnTo;
