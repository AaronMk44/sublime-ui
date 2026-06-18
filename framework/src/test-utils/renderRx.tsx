import { createElement, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { renderHook, type RenderHookResult } from '@testing-library/react';
import { store } from '../store/store.js';

/** renderHook wrapped in the framework's Redux Provider. */
export function renderRx<R>(hook: () => R): RenderHookResult<R, void> {
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(Provider, { store, children });
  return renderHook(hook, { wrapper });
}
