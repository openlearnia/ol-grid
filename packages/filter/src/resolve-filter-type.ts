import type { ColumnDef } from "@ol-grid/core";
import type { ProvidedFilterType } from "./types.js";
import { resolveCustomFilterSource } from "./custom-filter.js";

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

export function resolveColumnFilterKind<TData>(
  colDef: ColumnDef<TData>,
): "text" | "number" | "date" | "custom" | null {
  const provided = resolveFilterType(colDef);
  if (provided) return provided;
  if (resolveCustomFilterSource(colDef)) return "custom";
  return null;
}

export function columnHasFilter<TData>(colDef: ColumnDef<TData>): boolean {
  return resolveColumnFilterKind(colDef) !== null;
}

export function resolveFloatingFilter<TData>(
  colDef: ColumnDef<TData>,
  defaultColDef?: Partial<ColumnDef<TData>>,
): boolean {
  if (colDef.floatingFilter === false) return false;
  const kind = resolveColumnFilterKind(colDef);
  // Custom filters use popup UI only in v1 (no floating host yet).
  if (kind === "custom") return false;
  if (colDef.floatingFilter === true) return kind !== null;
  if (defaultColDef?.floatingFilter === true) return kind !== null;
  return false;
}

export function resolveCustomFilterKey<TData>(colDef: ColumnDef<TData>): string | null {
  const source = resolveCustomFilterSource(colDef);
  return source?.key ?? null;
}
