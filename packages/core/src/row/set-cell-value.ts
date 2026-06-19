import type { ColumnDef } from "../types/column.js";
import type { RowNode } from "../types/row.js";
import { getCellValue } from "./get-cell-value.js";

export function setCellValue<TData>(
  node: RowNode<TData>,
  colDef: ColumnDef<TData>,
  newValue: unknown,
  api: unknown,
  context: unknown,
): boolean {
  const data = node.data;
  if (data === undefined) return false;

  const oldValue = getCellValue(node, colDef, api, context);

  if (colDef.valueSetter) {
    return colDef.valueSetter({
      data,
      newValue,
      oldValue,
      colDef,
      node,
      api,
      context,
    });
  }

  if (colDef.field) {
    (data as Record<string, unknown>)[colDef.field] = newValue;
    return true;
  }

  return false;
}
