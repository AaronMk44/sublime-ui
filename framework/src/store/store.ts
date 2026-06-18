import { configureStore, combineReducers, type Reducer } from '@reduxjs/toolkit';
import { reducerRegistry } from './reducerRegistry.js';
import type { ModelSliceState } from './createModelSlice.js';

function rootReducer(reducers: Record<string, Reducer>): Reducer {
  if (Object.keys(reducers).length === 0) {
    // RTK requires at least one reducer; a placeholder keeps the store valid
    // until the first model slice registers.
    return combineReducers({ __sublime: (state: null = null) => state });
  }
  return combineReducers(reducers);
}

export const store = configureStore({
  reducer: rootReducer(reducerRegistry.getReducers()),
  // Items are plain JSON, but ApiError lives in slice.error; disable the
  // serializable check on that single path rather than store class instances.
  middleware: (getDefault) =>
    getDefault({
      serializableCheck: {
        ignoredPaths: [/\.error$/],
        ignoredActionPaths: [/^payload$/, /\.error$/],
      },
    }),
});

reducerRegistry.setChangeListener((reducers) => {
  store.replaceReducer(rootReducer(reducers));
});

export function registerReducer(name: string, reducer: Reducer): void {
  reducerRegistry.register(name, reducer);
}

export type RootState = Record<string, ModelSliceState>;
export type AppDispatch = typeof store.dispatch;
