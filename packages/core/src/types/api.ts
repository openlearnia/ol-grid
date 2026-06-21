import type { GridOptions, SortModel } from "./options.js";
import type { ApplyColumnStateParams, ColumnState } from "./column.js";
import type { RowNode } from "./row.js";
import type { CellPosition } from "./state.js";

export interface StartEditingCellParams {
  rowIndex: number;
  colKey: string;
}

export interface CsvExportParams {
  fileName?: string;
  columnSeparator?: string;
}

export interface GridApi<TData = unknown> {
  setGridOption<K extends keyof GridOptions<TData>>(
    key: K,
    value: GridOptions<TData>[K],
  ): void;
  getDisplayedRowCount(): number;
  getRowNode(id: string): RowNode<TData> | undefined;
  forEachNode(callback: (node: RowNode<TData>) => void): void;
  getSelectedRows(): TData[];
  setFocusedCell(rowIndex: number, colKey: string): void;
  getFocusedCell(): CellPosition | null;
  clearFocusedCell(): void;
  ensureIndexVisible(rowIndex: number, position?: "top" | "middle" | "bottom"): void;
  getColumnState(): ColumnState[];
  applyColumnState(params: ApplyColumnStateParams): boolean;
  setQuickFilterText(text: string): void;
  setFilterModel(model: Record<string, unknown> | null): void;
  getFilterModel(): Record<string, unknown>;
  destroyFilter(colKey: string): void;
  startEditingCell(params: StartEditingCellParams): void;
  stopEditing(cancel?: boolean): void;
  exportDataAsCsv(params?: CsvExportParams): void;
  getSortModel(): SortModel;
  setSortModel(model: SortModel): void;
  destroy(): void;
}
