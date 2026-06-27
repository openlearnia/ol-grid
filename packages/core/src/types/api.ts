import type { GridOptions, SortModel } from "./options.js";
import type { ApplyColumnStateParams, ColumnDef, ColumnState } from "./column.js";
import type { RowNode } from "./row.js";
import type { CellPosition } from "./state.js";
import type { RowDataTransaction, RowDataTransactionResult } from "../row/apply-transaction.js";
import type { GridEventMap, GridEventType } from "../events/grid-events.js";
import type { EventUnsubscribe } from "../events/event-bus.js";
import type {
  DisplayedColumnsChangedEvent,
  FilterChangedEvent,
  FilterOpenedEvent,
  SelectionChangedEvent,
  SortChangedEvent,
} from "./events.js";

export type Unsubscribe = EventUnsubscribe;

export interface StartEditingCellParams {
  rowIndex: number;
  colKey: string;
}

export interface ProcessCellForExportParams<TData = unknown> {
  value: unknown;
  node: RowNode<TData>;
  column: ColumnDef<TData>;
  colDef: ColumnDef<TData>;
  api: GridApi<TData>;
  context: unknown;
}

export interface ProcessHeaderForExportParams<TData = unknown> {
  column: ColumnDef<TData>;
  colDef: ColumnDef<TData>;
  api: GridApi<TData>;
  context: unknown;
}

export interface CsvExportParams {
  fileName?: string;
  columnSeparator?: string;
  includeHeaders?: boolean;
  onlySelected?: boolean;
  processCellCallback?: (params: ProcessCellForExportParams) => string;
  processHeaderCallback?: (params: ProcessHeaderForExportParams) => string;
}

export type { RowDataTransaction, RowDataTransactionResult };

/**
 * Imperative grid API. Available from `onGridReady` and adapter refs.
 *
 * Some methods require optional modules (e.g. `setSortModel` → `SortModule`,
 * `paginationGoToPage` → `PaginationModule`). Framework adapters register common modules.
 *
 * @typeParam TData - Row object shape.
 *
 * @example
 * ```ts
 * onGridReady: (event) => {
 *   const api = event.api;
 *   api.setSortModel([{ colId: "country", sort: "asc" }]);
 *   api.paginationGoToPage(0);
 *   api.exportDataAsCsv({ fileName: "export.csv" });
 * }
 * ```
 */
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
  moveColumn(colKey: string, toIndex: number): void;
  setQuickFilterText(text: string): void;
  setFilterModel(model: Record<string, unknown> | null): void;
  getFilterModel(): Record<string, unknown>;
  destroyFilter(colKey: string): void;
  startEditingCell(params: StartEditingCellParams): void;
  stopEditing(cancel?: boolean): void;
  exportDataAsCsv(params?: CsvExportParams): void;
  getDataAsCsv(params?: CsvExportParams): string;
  applyTransaction(transaction: RowDataTransaction<TData>): RowDataTransactionResult<TData>;
  refreshInfiniteCache(): void;
  purgeInfiniteCache(): void;
  getInfiniteRowCount(): number;
  isLastRowIndexKnown(): boolean;
  getSortModel(): SortModel;
  setSortModel(model: SortModel): void;
  paginationGetCurrentPage(): number;
  paginationGetTotalPages(): number;
  paginationGetPageSize(): number;
  paginationGoToPage(page: number): void;
  paginationGoToFirstPage(): void;
  paginationGoToLastPage(): void;
  paginationGoToNextPage(): void;
  paginationGoToPreviousPage(): void;
  paginationSetPageSize(size: number): void;
  autoSizeColumn(colKey: string, skipHeader?: boolean): void;
  autoSizeColumns(colKeys: string[], skipHeader?: boolean): void;
  autoSizeAllColumns(skipHeader?: boolean): void;
  sizeColumnsToFit(width?: number): void;
  selectAll(): void;
  deselectAll(): void;
  addEventListener<T extends GridEventType>(
    type: T,
    listener: (event: GridEventMap[T]) => void,
  ): void;
  removeEventListener<T extends GridEventType>(
    type: T,
    listener: (event: GridEventMap[T]) => void,
  ): void;
  onFilterChanged(listener: (event: FilterChangedEvent) => void): Unsubscribe;
  destroy(): void;
}
