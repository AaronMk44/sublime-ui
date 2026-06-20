import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { DataError } from '../errors/DataError.js';

export type ModelStatus = 'idle' | 'loading' | 'success' | 'error';

type PlainEntity = Record<string, unknown>;

export interface ModelSliceState {
  items: PlainEntity[];
  activeId: string | number | null;
  status: ModelStatus;
  error: DataError | null;
}

export function createModelSlice(name: string, opts: { idKey: string }) {
  const { idKey } = opts;
  const initialState: ModelSliceState = {
    items: [],
    activeId: null,
    status: 'idle',
    error: null,
  };

  const slice = createSlice({
    name,
    initialState,
    reducers: {
      setItems: (state, action: PayloadAction<PlainEntity[]>) => {
        state.items = action.payload;
        state.status = 'success';
        state.error = null;
      },
      upsertItems: (state, action: PayloadAction<PlainEntity[]>) => {
        for (const incoming of action.payload) {
          const i = state.items.findIndex((it) => it[idKey] === incoming[idKey]);
          if (i === -1) state.items.push(incoming);
          else state.items[i] = incoming;
        }
        state.status = 'success';
        state.error = null;
      },
      upsertItem: (state, action: PayloadAction<PlainEntity>) => {
        const incoming = action.payload;
        const i = state.items.findIndex((it) => it[idKey] === incoming[idKey]);
        if (i === -1) state.items.push(incoming);
        else state.items[i] = incoming;
      },
      removeItem: (state, action: PayloadAction<string | number>) => {
        state.items = state.items.filter((it) => it[idKey] !== action.payload);
      },
      setActive: (state, action: PayloadAction<string | number | null>) => {
        state.activeId = action.payload;
      },
      setStatus: (state, action: PayloadAction<ModelStatus>) => {
        state.status = action.payload;
      },
      setError: (state, action: PayloadAction<DataError | null>) => {
        state.error = action.payload;
        state.status = action.payload ? 'error' : state.status;
      },
      reset: () => initialState,
    },
  });

  return { name, reducer: slice.reducer, actions: slice.actions };
}

export type ModelSlice = ReturnType<typeof createModelSlice>;
