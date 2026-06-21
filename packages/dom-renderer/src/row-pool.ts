import { DEFAULT_OVERSCAN_ROW_COUNT, type RenderFrame } from "@ol-grid/core";
import { createRowTransform } from "./scroll-render.js";

export interface RowSectionContainers {
  pinnedLeft: HTMLElement;
  center: HTMLElement;
  pinnedRight: HTMLElement;
}

export type RowSectionKey = "pinnedLeft" | "center" | "pinnedRight";

export type PatchRowCellsFn = (
  rowEl: HTMLElement,
  section: RowSectionKey,
  row: RenderFrame["rows"][number],
  frame: RenderFrame,
) => void;

export type PatchRowMetaFn = (
  rowEl: HTMLElement,
  row: RenderFrame["rows"][number],
  frame: RenderFrame,
  width: number,
) => void;

/** Reorder container children to match `ordered` without replaceChildren. */
export function reconcileRowOrder(container: HTMLElement, ordered: readonly HTMLElement[]): void {
  for (let index = 0; index < ordered.length; index++) {
    const rowEl = ordered[index]!;
    if (container.children[index] !== rowEl) {
      container.insertBefore(rowEl, container.children[index] ?? null);
    }
  }
  while (container.children.length > ordered.length) {
    container.removeChild(container.lastChild!);
  }
}

function rowIndexFromEl(rowEl: HTMLElement): number {
  return Number(rowEl.dataset.rowIndex);
}

/** Active row pool — retains mounted rows across scroll idle instead of fully draining. */
export class RowPool {
  private readonly rowMaps: Record<RowSectionKey, Map<string, HTMLElement>> = {
    pinnedLeft: new Map(),
    center: new Map(),
    pinnedRight: new Map(),
  };

  private appliedRowOffset = NaN;
  private appliedRowStart = -1;
  private appliedRowEnd = -1;
  /** Last retained virtual range (+ overscan); rows inside stay mounted when idle. */
  private warmRowStart = -1;
  private warmRowEnd = -1;

  reset(): void {
    for (const map of Object.values(this.rowMaps)) {
      map.clear();
    }
    this.appliedRowOffset = NaN;
    this.appliedRowStart = -1;
    this.appliedRowEnd = -1;
    this.warmRowStart = -1;
    this.warmRowEnd = -1;
  }

  getAppliedVirtualRange(): { rowStart: number; rowEnd: number; rowOffset: number } {
    return {
      rowStart: this.appliedRowStart,
      rowEnd: this.appliedRowEnd,
      rowOffset: this.appliedRowOffset,
    };
  }

  getWarmRange(): { rowStart: number; rowEnd: number } {
    return { rowStart: this.warmRowStart, rowEnd: this.warmRowEnd };
  }

  /** True when the pool still has row nodes from a prior virtual range. */
  hasMountedRows(): boolean {
    return this.appliedRowStart >= 0 && this.appliedRowEnd >= this.appliedRowStart;
  }

  /** Expand retained range without shrinking (pre-scroll warm-up). */
  expandWarmRange(rowStart: number, rowEnd: number): void {
    if (rowEnd < rowStart) return;
    if (this.warmRowStart < 0) {
      this.warmRowStart = rowStart;
      this.warmRowEnd = rowEnd;
      return;
    }
    this.warmRowStart = Math.min(this.warmRowStart, rowStart);
    this.warmRowEnd = Math.max(this.warmRowEnd, rowEnd);
  }

  /** Immediate transform sync — call on every scroll event before store refresh. */
  applyRowOffset(containers: RowSectionContainers, rowOffset: number): boolean {
    if (this.appliedRowOffset === rowOffset) return false;
    const transform = createRowTransform(rowOffset);
    containers.pinnedLeft.style.transform = transform;
    containers.center.style.transform = transform;
    containers.pinnedRight.style.transform = transform;
    this.appliedRowOffset = rowOffset;
    return true;
  }

  rangeOverlapsApplied(rowStart: number, rowEnd: number): boolean {
    if (this.appliedRowStart < 0 || this.appliedRowEnd < 0) return false;
    return rowStart <= this.appliedRowEnd && rowEnd >= this.appliedRowStart;
  }

  /**
   * Grow or replace the warm range. Overlapping scroll updates expand; large jumps replace.
   * Never shrinks on idle-only sync — velocity overscan rows stay mounted until evicted.
   */
  private updateWarmRange(rowStart: number, rowEnd: number, rowCount: number): void {
    if (rowCount <= 0 || rowEnd < rowStart) {
      this.warmRowStart = -1;
      this.warmRowEnd = -1;
      return;
    }

    const maxIndex = rowCount - 1;
    const nextStart = Math.max(0, rowStart);
    const nextEnd = Math.min(maxIndex, rowEnd);

    if (this.warmRowStart < 0) {
      this.warmRowStart = nextStart;
      this.warmRowEnd = nextEnd;
      return;
    }

    const overlaps = rowStart <= this.warmRowEnd && rowEnd >= this.warmRowStart;
    if (overlaps) {
      this.warmRowStart = Math.min(this.warmRowStart, nextStart);
      this.warmRowEnd = Math.max(this.warmRowEnd, nextEnd);
      return;
    }

    this.warmRowStart = nextStart;
    this.warmRowEnd = nextEnd;
  }

  syncFrame(
    containers: RowSectionContainers,
    frame: RenderFrame,
    patchRowMeta: PatchRowMetaFn,
    patchRowCells: PatchRowCellsFn,
  ): void {
    this.applyRowOffset(containers, frame.rowOffset);

    const rowCount =
      frame.rowHeight > 0 ? Math.max(0, Math.round(frame.totalHeight / frame.rowHeight)) : 0;
    this.updateWarmRange(frame.virtualRange.rowStart, frame.virtualRange.rowEnd, rowCount);

    const nextIds = new Set(frame.rows.map((row) => row.id));
    const sections: Array<{
      key: RowSectionKey;
      container: HTMLElement;
      width: number;
    }> = [
      { key: "pinnedLeft", container: containers.pinnedLeft, width: frame.pinnedLeftWidth },
      { key: "center", container: containers.center, width: frame.centerWidth },
      { key: "pinnedRight", container: containers.pinnedRight, width: frame.pinnedRightWidth },
    ];

    for (const section of sections) {
      const map = this.rowMaps[section.key];
      const ordered: HTMLElement[] = [];

      for (const row of frame.rows) {
        let rowEl = map.get(row.id);
        if (!rowEl) {
          rowEl = document.createElement("div");
          rowEl.className = "ol-grid__row";
          rowEl.setAttribute("role", "row");
          map.set(row.id, rowEl);
        }

        patchRowMeta(rowEl, row, frame, section.width);
        patchRowCells(rowEl, section.key, row, frame);
        ordered.push(rowEl);
      }

      reconcileRowOrder(section.container, ordered);

      for (const [rowId, rowEl] of map) {
        if (nextIds.has(rowId)) continue;
        const rowIndex = rowIndexFromEl(rowEl);
        const inWarmRange =
          this.warmRowStart >= 0 &&
          !Number.isNaN(rowIndex) &&
          rowIndex >= this.warmRowStart &&
          rowIndex <= this.warmRowEnd;

        if (inWarmRange) {
          // Keep DOM nodes in the map for reuse, but detach warm-only rows —
          // mounting them shifts the contiguous stack and breaks rowOffset layout.
          if (rowEl.parentElement === section.container) {
            section.container.removeChild(rowEl);
          }
          continue;
        }

        if (rowEl.parentElement === section.container) {
          section.container.removeChild(rowEl);
        }
        map.delete(rowId);
      }
    }

    this.appliedRowStart = frame.virtualRange.rowStart;
    this.appliedRowEnd = frame.virtualRange.rowEnd;
  }
}

export { DEFAULT_OVERSCAN_ROW_COUNT };
