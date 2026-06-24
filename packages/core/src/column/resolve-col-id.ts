import type { ColumnDef } from "../types/column.js";

export function resolveColId<TData>(colDef: ColumnDef<TData>, index: number): string {
  // Stable id: explicit id > field name > positional fallback.
  return colDef.id ?? colDef.field ?? `col-${index}`;
}
