import { flattenColumnDefs } from "./flatten-column-defs.js";
import type { ColumnDef, SortDef } from "../types/column.js";
import type { SortModel } from "../types/options.js";

export function resolveColumnDefInitialSort(
  def: Pick<ColumnDef, "sort" | "initialSort">,
): { sort: "asc" | "desc"; sortIndex?: number } | null {
  // `sort` and `initialSort` are aliases; string form is shorthand for { sort }.
  const raw = def.sort ?? def.initialSort;
  if (!raw) return null;
  if (typeof raw === "string") return { sort: raw };
  return { sort: raw.sort, sortIndex: raw.sortIndex };
}

export function extractInitialSortModelFromColumnDefs<TData>(
  columnDefs: ColumnDef<TData>[],
): SortModel {
  const flat = flattenColumnDefs(columnDefs);
  const entries: Array<{
    colId: string;
    sort: "asc" | "desc";
    sortIndex: number;
    order: number;
  }> = [];

  flat.forEach(({ def, colId }, order) => {
    const resolved = resolveColumnDefInitialSort(def);
    if (!resolved) return;
    entries.push({
      colId,
      sort: resolved.sort,
      // Omitted sortIndex falls back to column definition order within the flat list.
      sortIndex: resolved.sortIndex ?? order,
      order,
    });
  });

  entries.sort((left, right) => {
    const byIndex = left.sortIndex - right.sortIndex;
    // Equal sortIndex: preserve definition order as tie-breaker.
    return byIndex !== 0 ? byIndex : left.order - right.order;
  });

  return entries.map(({ colId, sort }) => ({ colId, sort }));
}
