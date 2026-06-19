import type { SelectionState } from "../types/state.js";

export type RowSelectionMode = "single" | "multiple";

export function rowSelectionToMode(
  rowSelection: RowSelectionMode | undefined,
): SelectionState["mode"] | null {
  if (rowSelection === "single") return "singleRow";
  if (rowSelection === "multiple") return "multiRow";
  return null;
}

export function createSelectionState(mode: SelectionState["mode"]): SelectionState {
  return {
    mode,
    selectedRowIds: new Set(),
    focusedCell: null,
  };
}

export function isRowSelected(state: SelectionState, rowId: string): boolean {
  return state.selectedRowIds.has(rowId);
}

export interface RowClickSelectionParams {
  rowId: string;
  multiSelect: boolean;
}

export function handleRowClickSelection(
  state: SelectionState,
  params: RowClickSelectionParams,
): SelectionState {
  const { rowId, multiSelect } = params;

  if (state.mode === "singleRow") {
    if (state.selectedRowIds.has(rowId) && state.selectedRowIds.size === 1) {
      return state;
    }
    return {
      ...state,
      selectedRowIds: new Set([rowId]),
    };
  }

  if (state.mode === "multiRow") {
    const next = new Set(state.selectedRowIds);
    if (multiSelect) {
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
    } else {
      if (next.size === 1 && next.has(rowId)) {
        return state;
      }
      next.clear();
      next.add(rowId);
    }
    return { ...state, selectedRowIds: next };
  }

  return state;
}

export function toggleRowSelection(state: SelectionState, rowId: string): SelectionState {
  if (state.mode !== "multiRow") return state;

  const next = new Set(state.selectedRowIds);
  if (next.has(rowId)) {
    next.delete(rowId);
  } else {
    next.add(rowId);
  }
  return { ...state, selectedRowIds: next };
}

export function selectionChanged(
  prev: SelectionState,
  next: SelectionState,
): boolean {
  if (prev.selectedRowIds.size !== next.selectedRowIds.size) return true;
  for (const id of prev.selectedRowIds) {
    if (!next.selectedRowIds.has(id)) return true;
  }
  return false;
}

export type HeaderCheckboxState = "checked" | "unchecked" | "indeterminate";

export function getHeaderCheckboxState(
  state: SelectionState,
  rowIds: readonly string[],
): HeaderCheckboxState {
  if (rowIds.length === 0) return "unchecked";

  let selectedCount = 0;
  for (const rowId of rowIds) {
    if (state.selectedRowIds.has(rowId)) selectedCount++;
  }

  if (selectedCount === 0) return "unchecked";
  if (selectedCount === rowIds.length) return "checked";
  return "indeterminate";
}

export function selectAllRows(state: SelectionState, rowIds: readonly string[]): SelectionState {
  if (state.mode !== "multiRow") return state;
  return { ...state, selectedRowIds: new Set(rowIds) };
}

export function deselectAllRows(state: SelectionState): SelectionState {
  return { ...state, selectedRowIds: new Set() };
}

export function toggleSelectAll(state: SelectionState, rowIds: readonly string[]): SelectionState {
  const checkboxState = getHeaderCheckboxState(state, rowIds);
  if (checkboxState === "checked") {
    return deselectAllRows(state);
  }
  return selectAllRows(state, rowIds);
}
