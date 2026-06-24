import type { ColumnDef } from "../types/column.js";

export function mergeColumnDefs<TData>(
  columnDefs: ColumnDef<TData>[],
  defaultColDef?: Partial<ColumnDef<TData>>,
): ColumnDef<TData>[] {
  if (!defaultColDef) return columnDefs;

  return columnDefs.map((def) => mergeOne(def, defaultColDef));
}

function mergeOne<TData>(
  def: ColumnDef<TData>,
  defaultColDef: Partial<ColumnDef<TData>>,
): ColumnDef<TData> {
  const merged: ColumnDef<TData> = { ...defaultColDef, ...def };
  if (defaultColDef.meta || def.meta) {
    merged.meta = { ...defaultColDef.meta, ...def.meta };
  }
  if (def.children?.length) {
    merged.children = def.children.map((child) => mergeOne(child, defaultColDef));
  }
  return merged;
}
