import { NavProvider, useNav } from '../../src/navigation';
// Import the ACTUAL generated route map that `build:nav` emits — the same
// `routes.d.ts` the devkit `typecheck:fixture` script compiles. This makes the
// type test verify `turnTo` against real generator output (so an erased `void`
// for `product` would fail here), not a hand-written fiction.
import type { AppRoutes } from '../../../devkit/test/fixtures/nav-app/src/navigation/routes';

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
