import { expectTypeOf } from 'vitest';
import type { BookDef, MobileFormat, RouteMap, WebFormat } from '../../src/navigation/types';

expectTypeOf<MobileFormat>().toEqualTypeOf<'drawer' | 'stack' | 'bottomNav'>();
expectTypeOf<WebFormat>().toEqualTypeOf<'sidebar' | 'stack' | 'tabs'>();

// A `bottomNav` book must not accept a web-only `'sidebar'` format.
const bad: BookDef<'bottomNav', RouteMap> = {
  kind: 'book',
  // @ts-expect-error - 'sidebar' is not assignable to the mobile 'bottomNav' format param
  format: 'sidebar',
  pages: {},
};
void bad;
