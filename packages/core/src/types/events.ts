import type { ColumnDef } from "./column.js";
import type { GridApi } from "./api.js";
import type { RowNode } from "./row.js";

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

export interface SortChangedEvent {
  api: GridApi;
  source: string;
}

export interface FilterChangedEvent {
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

export interface RowDataUpdatedEvent {
  api: GridApi;
}

export interface ColumnResizedEvent {
  colId: string;
  width: number;
  api: GridApi;
  finished: boolean;
}

export interface GridEvents<TData = unknown> {
  onGridReady?: (event: GridReadyEvent<TData>) => void;
  onCellClicked?: (event: CellClickedEvent<TData>) => void;
  onCellValueChanged?: (event: CellValueChangedEvent<TData>) => void;
  onSelectionChanged?: (event: SelectionChangedEvent) => void;
  onSortChanged?: (event: SortChangedEvent) => void;
  onFilterChanged?: (event: FilterChangedEvent) => void;
  onColumnResized?: (event: ColumnResizedEvent) => void;
  onRowDataUpdated?: (event: RowDataUpdatedEvent) => void;
}
