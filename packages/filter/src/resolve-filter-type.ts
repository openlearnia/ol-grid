import type { ColumnDef } from "@ol-grid/core";
import type { ProvidedFilterType } from "./types.js";

export function resolveFilterType<TData>(colDef: ColumnDef<TData>): ProvidedFilterType | null {
  const filter = colDef.filter;
  if (filter === "number" || filter === "date" || filter === "text") {
    return filter;
  }
  if (filter === true || colDef.filterable === true) {
    // Bare `filter: true` enables the default text filter UI.
    return "text";
  }
  return null;
}

export function columnHasFilter<TData>(colDef: ColumnDef<TData>): boolean {
  return resolveFilterType(colDef) !== null;
}

export function resolveFloatingFilter<TData>(
  colDef: ColumnDef<TData>,
  defaultColDef?: Partial<ColumnDef<TData>>,
): boolean {
  if (colDef.floatingFilter === false) return false;
  if (colDef.floatingFilter === true) return columnHasFilter(colDef);
  if (defaultColDef?.floatingFilter === true) return columnHasFilter(colDef);
  return false;
}
