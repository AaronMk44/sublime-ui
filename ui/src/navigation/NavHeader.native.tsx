import { AppBar } from '@sublime-ui/library';
import type { NavHeaderProps } from './NavHeader.types.js';

/**
 * Default mobile navigation header. Renders the shipped `AppBar` in place of
 * React Navigation's default native-stack / tab / drawer header. The generated
 * navigation wires it via `screenOptions={{ header: (props) => <NavHeader {...props} /> }}`.
 *
 * - Title falls back to the route name when a screen sets no `title`.
 * - The back arrow appears only when there is a screen to go back to (`back` is
 *   present), so root screens and tab/drawer top-level screens show none.
 */
export function NavHeader({ options, route, navigation, back }: NavHeaderProps) {
  const title = options.title ?? route.name;
  // Spread `onBack` only when there is somewhere to go back to — `exactOptional
  // PropertyTypes` forbids passing an explicit `undefined` for an optional prop.
  return <AppBar title={title} {...(back ? { onBack: () => navigation.goBack() } : {})} />;
}
