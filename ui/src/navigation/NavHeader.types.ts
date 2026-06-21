/**
 * Props for the default mobile navigation header (`NavHeader`).
 *
 * Declared as a minimal structural shape rather than importing React
 * Navigation's `NativeStackHeaderProps` / `BottomTabHeaderProps` /
 * `DrawerHeaderProps`, so `@sublime-ui/ui` does not couple to react-navigation
 * types. The header props React Navigation passes to a `screenOptions.header`
 * render function structurally satisfy this interface on every navigator;
 * `back` is present only on a native stack (and only when a screen can go back).
 */
export interface NavHeaderProps {
  options: { title?: string };
  route: { name: string };
  navigation: { goBack: () => void };
  back?: { title?: string };
}
