import { createElement, type ReactElement } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { SublimeProvider } from '../provider/SublimeProvider.js';

/** Renders a web component tree inside SublimeProvider (light mode). */
export function renderWeb(ui: ReactElement): RenderResult {
  return render(createElement(SublimeProvider, { mode: 'light', children: ui }));
}
