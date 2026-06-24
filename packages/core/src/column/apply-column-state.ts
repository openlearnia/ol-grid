import type { ApplyColumnStateParams, ColumnState } from "../types/column.js";

export interface ApplyColumnStateResult {
  columns: ColumnState[];
  success: boolean;
}

export function mergeColumnState(
  currentState: ColumnState[],
  params: ApplyColumnStateParams,
): ApplyColumnStateResult {
  const { state = [], applyOrder = false, defaultState } = params;
  const stateById = new Map(currentState.map((col) => [col.colId, { ...col }]));
  let success = true;

  for (const patch of state) {
    const existing = stateById.get(patch.colId);
    if (!existing) {
      if (defaultState) {
        stateById.set(patch.colId, { ...defaultState, ...patch, colId: patch.colId });
      } else {
        success = false;
      }
      continue;
    }
    stateById.set(patch.colId, { ...existing, ...patch });
  }

  let columns: ColumnState[];
  if (applyOrder && state.length > 0) {
    // `state` array order becomes column order; unmatched cols keep relative tail order.
    const orderedIds = state.map((col) => col.colId).filter((colId) => stateById.has(colId));
    const remainingIds = currentState
      .map((col) => col.colId)
      .filter((colId) => !orderedIds.includes(colId));
    columns = [...orderedIds, ...remainingIds].map((colId) => stateById.get(colId)!);
  } else {
    columns = currentState.map((col) => stateById.get(col.colId) ?? col);
    for (const patch of state) {
      if (!currentState.some((col) => col.colId === patch.colId) && stateById.has(patch.colId)) {
        columns.push(stateById.get(patch.colId)!);
      }
    }
  }

  return { columns, success };
}
