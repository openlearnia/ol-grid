import type { ColumnState } from "@ol-grid/core";
import type { SortComparatorFn } from "@ol-grid/core";
import type { RowNode } from "@ol-grid/core";
import { compareSortKeys, compareValues } from "./compare-values.js";

export function sortRowNodes<TData>(
  nodes: RowNode<TData>[],
  sort: "asc" | "desc",
  getValue: (node: RowNode<TData>) => unknown,
  comparator?: SortComparatorFn<TData, unknown>,
): RowNode<TData>[] {
  const length = nodes.length;
  if (length <= 1) return nodes;

  const direction = sort === "asc" ? 1 : -1;
  const isDescending = sort === "desc";

  const indices = new Uint32Array(length);
  for (let index = 0; index < length; index++) {
    indices[index] = index;
  }

  if (comparator) {
    const values = new Array<unknown>(length);
    for (let index = 0; index < length; index++) {
      values[index] = getValue(nodes[index]!);
    }

    indices.sort((left, right) => {
      const cmp = comparator(
        values[left]!,
        values[right]!,
        nodes[left]!,
        nodes[right]!,
        isDescending,
      );
      return cmp * direction;
    });
  } else {
    sortIndicesByValue(nodes, getValue, indices, direction);
  }

  const result = new Array<RowNode<TData>>(length);
  for (let index = 0; index < length; index++) {
    result[index] = nodes[indices[index]!]!;
  }
  return result;
}

function sortIndicesByValue<TData>(
  nodes: RowNode<TData>[],
  getValue: (node: RowNode<TData>) => unknown,
  indices: Uint32Array,
  direction: number,
): void {
  const length = nodes.length;
  let numeric = true;
  let stringOnly = true;
  const numbers = new Float64Array(length);
  const strings = new Array<string>(length);

  for (let index = 0; index < length; index++) {
    const value = getValue(nodes[index]!);
    if (numeric) {
      if (typeof value === "number" && !Number.isNaN(value)) {
        numbers[index] = value;
      } else {
        numeric = false;
      }
    }
    if (stringOnly) {
      if (typeof value === "string") {
        strings[index] = value;
      } else if (value === null || value === undefined) {
        strings[index] = "";
      } else {
        stringOnly = false;
      }
    }
    if (!numeric && !stringOnly) break;
  }

  if (numeric) {
    indices.sort((left, right) => (numbers[left]! - numbers[right]!) * direction);
    return;
  }

  if (stringOnly) {
    indices.sort((left, right) => compareSortKeys(strings[left]!, strings[right]!) * direction);
    return;
  }

  const values = new Array<unknown>(length);
  for (let index = 0; index < length; index++) {
    values[index] = getValue(nodes[index]!);
  }

  indices.sort((left, right) => compareValues(values[left]!, values[right]!) * direction);
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

export function sortModelsEqual(
  left: Array<{ colId: string; sort: "asc" | "desc" }>,
  right: Array<{ colId: string; sort: "asc" | "desc" }>,
): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index++) {
    const a = left[index]!;
    const b = right[index]!;
    if (a.colId !== b.colId || a.sort !== b.sort) return false;
  }
  return true;
}
