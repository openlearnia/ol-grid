import type { ColumnDef } from "./column.js";
import type { RowNode } from "./row.js";

export interface CellRendererParams<TData = unknown, TValue = unknown> {
  value: TValue;
  data: TData;
  node: RowNode<TData>;
  colDef: ColumnDef<TData, TValue>;
  api: unknown;
  context: unknown;
  rowIndex: number;
}

export type CellRendererFn<TData = unknown, TValue = unknown> = (
  params: CellRendererParams<TData, TValue>,
) => string | HTMLElement | void;
