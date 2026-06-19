import { createContext, createElement, useContext, type ReactNode } from 'react';
import type { Nav, TypedNav } from './nav.types';
import type { RouteMap } from './types';

export const NavContext = createContext<Nav | null>(null);

export function NavProvider(props: { value: Nav; children: ReactNode }) {
  return createElement(NavContext.Provider, { value: props.value }, props.children);
}

export function useNav<RM extends RouteMap = RouteMap>(): TypedNav<RM> {
  const nav = useContext(NavContext);
  if (nav === null) throw new Error('useNav() must be used within <Navigation> (NavProvider missing)');
  return nav as unknown as TypedNav<RM>;
}
