import type { ColumnDef } from "./column.js";
import type { GridApi } from "./api.js";
import type { RowNode } from "./row.js";
import type { SortModel } from "./options.js";

export interface GridReadyEvent<TData = unknown> {
  api: GridApi<TData>;
  columnApi: unknown;
  context: unknown;
}

export interface CellClickedEvent<TData = unknown> {
  value: unknown;
  data: TData;
  rowIndex: number;
  colDef: ColumnDef<TData>;
  node: RowNode<TData>;
  api: GridApi<TData>;
  context: unknown;
}

export interface SelectionChangedEvent {
  api: GridApi;
  source: string;
}

export interface PaginationChangedEvent {
  api: GridApi;
  newPage: number;
  newPageSize: number;
}

export interface SortChangedEvent {
  api: GridApi;
  source: string;
}

export interface FilterChangedEvent {
  api: GridApi;
  source: string;
}

export interface FilterOpenedEvent {
  api: GridApi;
  colId: string;
  column: unknown;
}

export interface DisplayedColumnsChangedEvent {
  api: GridApi;
  source: string;
}

export interface CellValueChangedEvent<TData = unknown> {
  oldValue: unknown;
  newValue: unknown;
  data: TData;
  node: RowNode<TData>;
  colDef: ColumnDef<TData>;
  api: GridApi<TData>;
  context: unknown;
}

export interface RowDataUpdatedEvent<TData = unknown> {
  api: GridApi<TData>;
  type?: "full" | "transaction" | "immutable";
  transaction?: import("../row/apply-transaction.js").RowDataTransaction<TData>;
}

export interface ColumnResizedEvent {
  colId: string;
  width: number;
  api: GridApi;
  finished: boolean;
}

export interface ColumnMovedEvent {
  colId: string;
  toIndex: number;
  api: GridApi;
  finished: boolean;
  source?: string;
}

export interface GridEvents<TData = unknown> {
  onGridReady?: (event: GridReadyEvent<TData>) => void;
  onCellClicked?: (event: CellClickedEvent<TData>) => void;
  onCellValueChanged?: (event: CellValueChangedEvent<TData>) => void;
  onSelectionChanged?: (event: SelectionChangedEvent) => void;
  onSortChanged?: (event: SortChangedEvent) => void;
  onFilterChanged?: (event: FilterChangedEvent) => void;
  onFilterOpened?: (event: FilterOpenedEvent) => void;
  onDisplayedColumnsChanged?: (event: DisplayedColumnsChangedEvent) => void;
  onPaginationChanged?: (event: PaginationChangedEvent) => void;
  onColumnResized?: (event: ColumnResizedEvent) => void;
  onColumnMoved?: (event: ColumnMovedEvent) => void;
  onRowDataUpdated?: (event: RowDataUpdatedEvent<TData>) => void;
  /** Controlled mode: fires when sort model changes from UI or API. */
  onSortModelChange?: (sortModel: SortModel) => void;
  /** Controlled mode: fires when filter model changes from UI or API. */
  onFilterModelChange?: (filterModel: Record<string, unknown>) => void;
  /** Controlled mode: fires when selected row ids change from UI or API. */
  onSelectionChange?: (selectedRowIds: string[]) => void;
}
