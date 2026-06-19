import type { ColumnDef } from "../types/column.js";
import type { RowNode } from "../types/row.js";

export function getCellValue<TData>(
  node: RowNode<TData>,
  colDef: ColumnDef<TData>,
  api: unknown,
  context: unknown,
): unknown {
  const data = node.data;
  if (data === undefined) return undefined;

  if (colDef.valueGetter) {
    return colDef.valueGetter({
      data,
      node,
      colDef,
      column: null,
      api,
      context,
    });
  }

  if (colDef.field) {
    return (data as Record<string, unknown>)[colDef.field];
  }

  return undefined;
}

export function formatCellValue<TData>(
  value: unknown,
  node: RowNode<TData>,
  colDef: ColumnDef<TData>,
  api: unknown,
  context: unknown,
): string {
  if (colDef.valueFormatter) {
    return colDef.valueFormatter({
      value,
      data: node.data as TData,
      node,
      colDef,
      column: null,
      api,
      context,
    });
  }

  if (value === null || value === undefined) return "";
  return String(value);
}
