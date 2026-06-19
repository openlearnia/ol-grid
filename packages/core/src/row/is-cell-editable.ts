import type { ColumnDef, EditableCallbackParams } from "../types/column.js";
import type { RowNode } from "../types/row.js";

export function isCellEditable<TData>(
  colDef: ColumnDef<TData>,
  node: RowNode<TData>,
  api: unknown,
  context: unknown,
): boolean {
  if (colDef.editable === undefined) return false;
  if (typeof colDef.editable === "function") {
    const params: EditableCallbackParams<TData> = {
      data: node.data as TData,
      colDef,
      node,
      api,
      context,
    };
    return colDef.editable(params);
  }
  return colDef.editable;
}
