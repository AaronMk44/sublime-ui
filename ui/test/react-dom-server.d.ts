// react-dom has no bundled types and @types/react-dom is not installed in this
// workspace. The navigation tests only need renderToStaticMarkup to drive the
// React tree; declare just that entry so strict tsc passes.
declare module 'react-dom/server' {
  import type { ReactElement } from 'react';
  export function renderToStaticMarkup(element: ReactElement): string;
}
