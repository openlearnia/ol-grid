import type { ColumnDef } from "../types/column.js";

export function resolveColId<TData>(colDef: ColumnDef<TData>, index: number): string {
  return colDef.id ?? colDef.field ?? `col-${index}`;
}
