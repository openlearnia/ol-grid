import type { ColumnDef, ValueParserParams } from "../types/column.js";
import type { RowNode } from "../types/row.js";
import { getCellValue } from "./get-cell-value.js";
import { setCellValue } from "./set-cell-value.js";

export interface CommitCellEditResult {
  committed: boolean;
  oldValue: unknown;
  newValue: unknown;
}

export function commitCellEdit<TData>(
  node: RowNode<TData>,
  colDef: ColumnDef<TData>,
  rawValue: string,
  api: unknown,
  context: unknown,
): CommitCellEditResult {
  const oldValue = getCellValue(node, colDef, api, context);
  let newValue: unknown = rawValue;

  if (colDef.valueParser) {
    const params: ValueParserParams<TData> = {
      newValue: rawValue,
      oldValue,
      data: node.data as TData,
      colDef,
      node,
      api,
      context,
    };
    newValue = colDef.valueParser(params);
  } else if (colDef.field && node.data !== undefined) {
    const fieldValue = (node.data as Record<string, unknown>)[colDef.field];
    if (typeof fieldValue === "number") {
      const parsed = Number(rawValue);
      newValue = Number.isNaN(parsed) ? rawValue : parsed;
    }
  }

  if (oldValue === newValue) {
    return { committed: true, oldValue, newValue };
  }

  const changed = setCellValue(node, colDef, newValue, api, context);
  return { committed: changed, oldValue, newValue };
}
