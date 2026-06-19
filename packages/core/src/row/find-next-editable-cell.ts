import type { NormalizedColumn } from "../column/column-model.js";
import type { CellPosition } from "../types/state.js";
import type { RowNode } from "../types/row.js";
import { isCellEditable } from "./is-cell-editable.js";

export function findNextEditableCell<TData>(
  current: CellPosition,
  forward: boolean,
  columns: NormalizedColumn<TData>[],
  getRowAt: (rowIndex: number) => RowNode<TData> | undefined,
  rowCount: number,
  api: unknown,
  context: unknown,
): CellPosition | null {
  if (columns.length === 0 || rowCount === 0) return null;

  const colIds = columns.map((col) => col.colId);
  const startColIndex = colIds.indexOf(current.colId);
  if (startColIndex < 0) return null;

  let rowIndex = current.rowIndex;
  let colIndex = startColIndex + (forward ? 1 : -1);

  for (let step = 0; step < colIds.length * rowCount; step++) {
    if (colIndex >= colIds.length) {
      colIndex = 0;
      rowIndex += 1;
      if (rowIndex >= rowCount) return null;
      continue;
    }
    if (colIndex < 0) {
      colIndex = colIds.length - 1;
      rowIndex -= 1;
      if (rowIndex < 0) return null;
      continue;
    }

    const column = columns[colIndex]!;
    const node = getRowAt(rowIndex);
    if (
      node &&
      isCellEditable(column.def, node, api, context)
    ) {
      if (rowIndex !== current.rowIndex || column.colId !== current.colId) {
        return { rowIndex, colId: column.colId };
      }
    }

    colIndex += forward ? 1 : -1;
  }

  return null;
}
