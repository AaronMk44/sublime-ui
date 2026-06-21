import type { NavHeaderProps } from './NavHeader.types.js';

/**
 * Web stub for `NavHeader`. Web navigation (react-router) renders its own chrome
 * and never mounts this header, so the mobile `NavHeader` is native-only. This
 * stub keeps the `@sublime-ui/ui/navigation` barrel importable in web builds;
 * Metro resolves the `.native` variant for React Native.
 */
export function NavHeader(_props: NavHeaderProps): null {
  return null;
}
