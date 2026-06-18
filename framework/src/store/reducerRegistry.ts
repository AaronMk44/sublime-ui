import type { Reducer } from '@reduxjs/toolkit';

const reducers: Record<string, Reducer> = {};
let onChange: ((reducers: Record<string, Reducer>) => void) | null = null;

export const reducerRegistry = {
  register(name: string, reducer: Reducer): void {
    if (reducers[name]) return; // idempotent
    reducers[name] = reducer;
    onChange?.({ ...reducers });
  },
  getReducers(): Record<string, Reducer> {
    return { ...reducers };
  },
  setChangeListener(listener: (reducers: Record<string, Reducer>) => void): void {
    onChange = listener;
  },
};
