import type { ColumnState } from "@ol-grid/core";
import type { SortComparatorFn } from "@ol-grid/core";
import type { RowNode } from "@ol-grid/core";
import { compareValues } from "./compare-values.js";

export function sortRowNodes<TData>(
  nodes: RowNode<TData>[],
  sort: "asc" | "desc",
  getValue: (node: RowNode<TData>) => unknown,
  comparator?: SortComparatorFn<TData, unknown>,
): RowNode<TData>[] {
  const direction = sort === "asc" ? 1 : -1;
  const isDescending = sort === "desc";
  return [...nodes].sort((left, right) => {
    const valueA = getValue(left);
    const valueB = getValue(right);
    const cmp = comparator
      ? comparator(valueA, valueB, left, right, isDescending)
      : compareValues(valueA, valueB);
    return cmp * direction;
  });
}

export function toggleColumnSort(current: "asc" | "desc" | null | undefined): "asc" | "desc" | null {
  if (!current) return "asc";
  if (current === "asc") return "desc";
  return null;
}

export function applySingleColumnSort(
  columns: ColumnState[],
  colId: string,
  nextSort: "asc" | "desc" | null,
): ColumnState[] {
  return columns.map((column) => ({
    ...column,
    sort: column.colId === colId ? nextSort : null,
    sortIndex: column.colId === colId && nextSort ? 0 : null,
  }));
}

export function applySortModel(
  columns: ColumnState[],
  sortModel: Array<{ colId: string; sort: "asc" | "desc" }>,
): ColumnState[] {
  return columns.map((column) => {
    const index = sortModel.findIndex((entry) => entry.colId === column.colId);
    if (index < 0) {
      return { ...column, sort: null, sortIndex: null };
    }
    const entry = sortModel[index]!;
    return { ...column, sort: entry.sort, sortIndex: index };
  });
}

export function getSortModel(
  columns: ColumnState[],
): Array<{ colId: string; sort: "asc" | "desc" }> {
  return columns
    .filter((column) => column.sort === "asc" || column.sort === "desc")
    .sort((left, right) => (left.sortIndex ?? 0) - (right.sortIndex ?? 0))
    .map((column) => ({ colId: column.colId, sort: column.sort! }));
}
