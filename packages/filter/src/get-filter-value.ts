import type { ColumnDef } from "@ol-grid/core";
import type { RowNode } from "@ol-grid/core";
import { getCellValue } from "@ol-grid/core";

export function getFilterValue<TData>(
  node: RowNode<TData>,
  colDef: ColumnDef<TData>,
  api: unknown,
  context: unknown,
): unknown {
  // filterValueGetter can supply a different value than the displayed cell value.
  if (colDef.filterValueGetter) {
    return colDef.filterValueGetter({
      data: node.data as TData,
      node,
      colDef,
      column: null,
      api,
      context,
    });
  }
  return getCellValue(node, colDef, api, context);
}
