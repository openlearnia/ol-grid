import type { ColumnDef } from "../types/column.js";
import { resolveColId } from "./resolve-col-id.js";

export interface FlattenedColumnDef<TData = unknown> {
  def: ColumnDef<TData>;
  colId: string;
  leafIndex: number;
}

export function isColumnGroup<TData>(def: ColumnDef<TData>): boolean {
  return Array.isArray(def.children) && def.children.length > 0;
}

export function flattenColumnDefs<TData>(
  columnDefs: ColumnDef<TData>[],
): FlattenedColumnDef<TData>[] {
  const result: FlattenedColumnDef<TData>[] = [];
  let leafIndex = 0;

  const walk = (defs: ColumnDef<TData>[]) => {
    for (const def of defs) {
      if (isColumnGroup(def)) {
        walk(def.children!);
        continue;
      }
      const colId = resolveColId(def, leafIndex);
      result.push({ def, colId, leafIndex });
      // Monotonic across the full tree — used when colId is omitted on a leaf def.
      leafIndex += 1;
    }
  };

  walk(columnDefs);
  return result;
}
