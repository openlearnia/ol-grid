import type { ColumnGroupState, ColumnState } from "./column.js";
import type { RowModelMeta, RowModelType } from "./row.js";

export interface CellPosition {
  rowIndex: number;
  colId: string;
}

export interface SelectionState {
  mode: "singleRow" | "multiRow" | "singleCell" | "range";
  selectedRowIds: Set<string>;
  focusedCell: CellPosition | null;
}

export interface EditingState {
  activeCell: CellPosition;
  editValue: string;
}

export interface SortingState {
  sortModel: Array<{ colId: string; sort: "asc" | "desc" }>;
}

export interface GridState {
  gridId: string;
  rowDataVersion: number;
  rowCount: number;
  columns: ColumnState[];
  columnGroupState: ColumnGroupState[];
  scrollTop: number;
  scrollLeft: number;
  viewportWidth: number;
  viewportHeight: number;
  sorting?: SortingState;
  selection?: SelectionState;
  focusedCell: CellPosition | null;
  focusedHeaderColId: string | null;
  editing: EditingState | null;
  quickFilterText: string;
  rowModelType: RowModelType;
  rowModelMeta: RowModelMeta;
}
