export const COLUMN_DRAGGING_CLASS = "ol-grid__header-cell--dragging";

export type ColumnPinRegion = "left" | "center" | "right";

export interface ColumnDropEntry {
  colId: string;
}

export interface ResolveColumnDropIndexOptions {
  clientX: number;
  region: ColumnPinRegion;
  regionContainer: HTMLElement;
  regionColumns: readonly ColumnDropEntry[];
  /** Column being dragged — enables direction-aware insert for adjacent swaps. */
  sourceColId?: string;
}

function clampDropIndex(index: number, regionLength: number): number {
  return Math.max(0, Math.min(index, regionLength - 1));
}

/**
 * Resolves the target index for a column drop within a pinned region.
 * Uses column-model order (not DOM order) so grouped headers with row-span
 * still map pointer position to the correct visual column.
 *
 * Retained for unit tests and as reference for drop-index semantics.
 */
export function resolveColumnDropIndex({
  clientX,
  regionContainer,
  regionColumns,
  sourceColId,
}: ResolveColumnDropIndexOptions): number | null {
  const headerByColId = new Map<string, HTMLElement>();
  for (const header of regionContainer.querySelectorAll<HTMLElement>(
    '[data-col-id][role="columnheader"]',
  )) {
    const colId = header.dataset.colId;
    if (colId && colId !== "__selection__") {
      headerByColId.set(colId, header);
    }
  }

  const sourceFromIndex = sourceColId
    ? regionColumns.findIndex((column) => column.colId === sourceColId)
    : -1;
  const lastIndex = regionColumns.length - 1;

  for (let index = 0; index < regionColumns.length; index++) {
    const header = headerByColId.get(regionColumns[index]!.colId);
    if (!header) continue;
    const rect = header.getBoundingClientRect();

    if (clientX < rect.left) {
      return index;
    }

    if (clientX < rect.right) {
      const midpoint = rect.left + rect.width / 2;
      const onLeftHalf = clientX < midpoint;

      if (sourceFromIndex < 0) {
        return clampDropIndex(onLeftHalf ? index : index + 1, regionColumns.length);
      }

      if (sourceFromIndex > index) {
        return index;
      }

      if (sourceFromIndex < index) {
        return clampDropIndex(onLeftHalf ? index : index + 1, regionColumns.length);
      }

      return clampDropIndex(onLeftHalf ? index : index + 1, regionColumns.length);
    }
  }

  return Math.max(0, lastIndex);
}

export function positionColumnMoveIndicator(
  indicator: HTMLElement,
  host: HTMLElement,
  clientX: number,
): void {
  const hostRect = host.getBoundingClientRect();
  indicator.style.left = `${clientX - hostRect.left}px`;
  indicator.style.display = "block";
}
