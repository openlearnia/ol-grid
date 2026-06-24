export interface ValueGetterParams<TData = unknown> {
  data: TData;
  node: unknown;
  colDef: ColumnDef<TData>;
  column: unknown;
  api: unknown;
  context: unknown;
}

export interface ValueSetterParams<TData = unknown, TValue = unknown> {
  data: TData;
  newValue: TValue;
  oldValue: TValue;
  colDef: ColumnDef<TData, TValue>;
  node: unknown;
  api: unknown;
  context: unknown;
}

export interface ValueParserParams<TData = unknown, TValue = unknown> {
  newValue: unknown;
  oldValue: TValue;
  data: TData;
  colDef: ColumnDef<TData, TValue>;
  node: unknown;
  api: unknown;
  context: unknown;
}

export interface ValueFormatterParams<TData = unknown, TValue = unknown> {
  value: TValue;
  data: TData;
  node: unknown;
  colDef: ColumnDef<TData, TValue>;
  column: unknown;
  api: unknown;
  context: unknown;
}

export interface EditableCallbackParams<TData = unknown> {
  data: TData;
  colDef: ColumnDef<TData>;
  node: unknown;
  api: unknown;
  context: unknown;
}

import type { RowNode } from "./row.js";
import type { CellRendererFn } from "./cell-renderer.js";

export type SortComparatorFn<TData = unknown, TValue = unknown> = (
  valueA: TValue,
  valueB: TValue,
  nodeA: RowNode<TData>,
  nodeB: RowNode<TData>,
  isDescending: boolean,
) => number;

export interface ColumnDef<TData = unknown, TValue = unknown> {
  id?: string;
  field?: keyof TData & string;
  headerName?: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  flex?: number;
  pinned?: "left" | "right" | null;
  sortable?: boolean;
  comparator?: SortComparatorFn<TData, TValue>;
  filterable?: boolean;
  filter?: boolean | "text" | "number" | "date";
  filterParams?: Record<string, unknown>;
  filterValueGetter?: (params: ValueGetterParams<TData>) => unknown;
  floatingFilter?: boolean;
  editable?: boolean | ((params: EditableCallbackParams<TData>) => boolean);
  hide?: boolean;
  children?: ColumnDef<TData>[];
  groupId?: string;
  suppressSizeToFit?: boolean;
  suppressMovable?: boolean;
  lockPosition?: boolean;
  lockPinned?: boolean;

  valueGetter?: (params: ValueGetterParams<TData>) => TValue;
  valueParser?: (params: ValueParserParams<TData, TValue>) => TValue;
  valueSetter?: (params: ValueSetterParams<TData, TValue>) => boolean;
  valueFormatter?: (params: ValueFormatterParams<TData, TValue>) => string;

  cellRenderer?: string | CellRendererFn<TData, TValue>;
  cellRendererParams?: Record<string, unknown>;
  cellEditor?: "text" | "number" | "select" | "date" | "largeText" | string | unknown;
  cellEditorParams?: Record<string, unknown>;
  headerRenderer?: string | unknown;

  rowGroup?: boolean;
  aggFunc?: string;

  meta?: Record<string, unknown>;
}

export interface ColumnState {
  colId: string;
  width?: number;
  hide?: boolean;
  pinned?: "left" | "right" | null;
  sort?: "asc" | "desc" | null;
  sortIndex?: number | null;
}

export interface ApplyColumnStateParams {
  state?: ColumnState[];
  applyOrder?: boolean;
  defaultState?: Partial<ColumnState>;
}

export interface ColumnGroupState {
  groupId: string;
  open: boolean;
}
