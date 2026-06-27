import type { ColumnDef } from "../types/column.js";
import { isColumnMovable, type ColumnMoveOptions } from "./is-column-movable.js";

export type ColumnPinRegion = "left" | "center" | "right";

export interface ColumnMoveEntry<TData = unknown> {
  colId: string;
  pinned: "left" | "right" | null;
  def: ColumnDef<TData>;
  isSelectionColumn?: boolean;
}

export function getColumnPinRegion(pinned: "left" | "right" | null): ColumnPinRegion {
  if (pinned === "left") return "left";
  if (pinned === "right") return "right";
  return "center";
}

export interface ComputeColumnMoveResult {
  orderedColIds: string[];
  fromIndex: number;
  toIndex: number;
}

/**
 * Computes a new global leaf column order after moving `colId` to `toIndex`
 * within its pin region (left / center / right).
 */
export function computeColumnMove<TData = unknown>(
  columns: readonly ColumnMoveEntry<TData>[],
  colId: string,
  toIndex: number,
  options: ColumnMoveOptions = {},
  flattenOrder?: readonly string[],
): ComputeColumnMoveResult | null {
  const column = columns.find((entry) => entry.colId === colId);
  if (!column || column.isSelectionColumn) return null;
  if (!isColumnMovable(column.def, options)) return null;

  const region = getColumnPinRegion(column.pinned);
  const regionColumns = columns.filter((entry) => {
    if (entry.isSelectionColumn) return false;
    return getColumnPinRegion(entry.pinned) === region;
  });

  const fromIndex = regionColumns.findIndex((entry) => entry.colId === colId);
  if (fromIndex < 0) return null;

  const clampedTo = Math.max(0, Math.min(toIndex, regionColumns.length - 1));
  if (fromIndex === clampedTo) return null;

  const regionIds = regionColumns.map((entry) => entry.colId);
  const nextRegionIds = [...regionIds];
  const [moved] = nextRegionIds.splice(fromIndex, 1);
  nextRegionIds.splice(clampedTo, 0, moved!);

  const nonSelection = columns.filter((entry) => !entry.isSelectionColumn);
  const nonSelectionIds = new Set(nonSelection.map((entry) => entry.colId));

  // Column model order is pin-grouped (left → center → right). Definition flatten order
  // can differ when a center column is declared after a pinned-right column — reorder
  // logic and validation must use flatten order when provided.
  const modelOrder = nonSelection.map((entry) => entry.colId);
  const baseOrder =
    flattenOrder !== undefined
      ? flattenOrder.filter((id) => nonSelectionIds.has(id))
      : modelOrder;

  const orderedColIds = baseOrder.slice();
  let nextRegionIndex = 0;
  for (let index = 0; index < orderedColIds.length; index++) {
    const id = orderedColIds[index]!;
    const entry = nonSelection.find((col) => col.colId === id);
    if (entry && getColumnPinRegion(entry.pinned) === region) {
      orderedColIds[index] = nextRegionIds[nextRegionIndex]!;
      nextRegionIndex += 1;
    }
  }

  return { orderedColIds, fromIndex, toIndex: clampedTo };
}
