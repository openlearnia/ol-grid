export type StoreListener = () => void;
export type Unsubscribe = () => void;
export type StateSelector<T> = (state: Readonly<GridState>) => T;

import type { GridState, EditingState, CellPosition } from "../types/state.js";

import type { ColumnState } from "../types/column.js";

import type { SelectionState } from "../types/state.js";

export type GridAction =
  | { type: "SET_SCROLL"; scrollTop: number; scrollLeft: number }
  | { type: "SET_VIEWPORT"; width: number; height: number }
  | { type: "SET_ROW_COUNT"; rowCount: number }
  | { type: "SET_COLUMNS"; columns: ColumnState[] }
  | { type: "SET_SELECTION"; selection: SelectionState }
  | { type: "SET_FOCUSED_CELL"; focusedCell: CellPosition | null }
  | { type: "SET_FOCUSED_HEADER"; focusedHeaderColId: string | null }
  | { type: "SET_EDITING"; editing: EditingState | null }
  | { type: "SET_QUICK_FILTER"; quickFilterText: string }
  | { type: "SET_FILTER_MODEL"; filterModel: Record<string, unknown> }
  | { type: "SET_OPEN_FILTER"; openFilterColId: string | null }
  | { type: "BUMP_ROW_DATA_VERSION" };

export interface GridStore {
  getState(): Readonly<GridState>;
  subscribe(listener: StoreListener): Unsubscribe;
  dispatch(action: GridAction): void;
  batch(fn: () => void): void;
  select<T>(selector: StateSelector<T>): T;
}

function createInitialState(gridId: string): GridState {
  return {
    gridId,
    rowDataVersion: 0,
    rowCount: 0,
    columns: [],
    columnGroupState: [],
    scrollTop: 0,
    scrollLeft: 0,
    viewportWidth: 0,
    viewportHeight: 0,
    focusedCell: null,
    focusedHeaderColId: null,
    editing: null,
    quickFilterText: "",
    filterModel: {},
    openFilterColId: null,
    rowModelType: "clientSide",
    rowModelMeta: {},
  };
}

function gridReducer(state: GridState, action: GridAction): GridState {
  switch (action.type) {
    case "SET_SCROLL":
      return { ...state, scrollTop: action.scrollTop, scrollLeft: action.scrollLeft };
    case "SET_VIEWPORT":
      return { ...state, viewportWidth: action.width, viewportHeight: action.height };
    case "SET_ROW_COUNT":
      return { ...state, rowCount: action.rowCount };
    case "SET_COLUMNS":
      return { ...state, columns: action.columns };
    case "SET_SELECTION":
      return { ...state, selection: action.selection };
    case "SET_FOCUSED_CELL":
      return { ...state, focusedCell: action.focusedCell };
    case "SET_FOCUSED_HEADER":
      return { ...state, focusedHeaderColId: action.focusedHeaderColId };
    case "SET_EDITING":
      return { ...state, editing: action.editing };
    case "SET_QUICK_FILTER":
      return { ...state, quickFilterText: action.quickFilterText };
    case "SET_FILTER_MODEL":
      return { ...state, filterModel: action.filterModel };
    case "SET_OPEN_FILTER":
      return { ...state, openFilterColId: action.openFilterColId };
    case "BUMP_ROW_DATA_VERSION":
      return { ...state, rowDataVersion: state.rowDataVersion + 1 };
    default:
      return state;
  }
}

export function createGridStore(gridId: string): GridStore {
  let state = createInitialState(gridId);
  const listeners = new Set<StoreListener>();
  let batchDepth = 0;
  let pendingNotify = false;

  function notify(): void {
    if (batchDepth > 0) {
      pendingNotify = true;
      return;
    }
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    getState() {
      return state;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    dispatch(action) {
      state = gridReducer(state, action);
      notify();
    },

    batch(fn) {
      batchDepth++;
      try {
        fn();
      } finally {
        batchDepth--;
        if (batchDepth === 0 && pendingNotify) {
          pendingNotify = false;
          notify();
        }
      }
    },

    select(selector) {
      return selector(state);
    },
  };
}
