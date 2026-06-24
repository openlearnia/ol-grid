import type { ColumnDef } from "../types/column.js";
import type { RowNode } from "../types/row.js";
import { formatCellValue, getCellValue } from "../row/get-cell-value.js";

export function normalizeQuickFilterText(text: string): string {
  return text.trim().toLowerCase();
}

export function rowMatchesQuickFilter<TData>(
  node: RowNode<TData>,
  columnDefs: ColumnDef<TData>[],
  filterText: string,
  api: unknown,
  context: unknown,
): boolean {
  const normalized = normalizeQuickFilterText(filterText);
  if (!normalized) return true;

  // OR across visible columns; matches formatted display text, not raw field values.
  for (const colDef of columnDefs) {
    if (colDef.hide) continue;
    const value = getCellValue(node, colDef, api, context);
    const display = formatCellValue(value, node, colDef, api, context);
    if (display.toLowerCase().includes(normalized)) {
      return true;
    }
  }

  return false;
}

export function filterRowsByQuickFilter<TData>(
  nodes: RowNode<TData>[],
  columnDefs: ColumnDef<TData>[],
  filterText: string,
  api: unknown,
  context: unknown,
): RowNode<TData>[] {
  const normalized = normalizeQuickFilterText(filterText);
  if (!normalized) return nodes;

  return nodes.filter((node) =>
    rowMatchesQuickFilter(node, columnDefs, filterText, api, context),
  );
}
