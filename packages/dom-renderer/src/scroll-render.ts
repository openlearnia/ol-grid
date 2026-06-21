import { computeRowVirtualRange, type RowVirtualRange } from "@ol-grid/core";

export interface ScrollVirtualInput {
  rowCount: number;
  rowHeight: number;
  scrollTop: number;
  viewportHeight: number;
  overscanRowCount?: number;
  extraOverscanBefore?: number;
  extraOverscanAfter?: number;
}

export function computeScrollVirtualRange(input: ScrollVirtualInput): RowVirtualRange {
  return computeRowVirtualRange(input);
}

export function createRowTransform(rowOffset: number): string {
  return `translate3d(0, ${rowOffset}px, 0)`;
}

/** Count of row indices present in both ranges (inclusive). */
export function countRangeOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): number {
  if (aEnd < aStart || bEnd < bStart) return 0;
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart) + 1);
}

/** True when transform should be applied before row pool diff (overlap or first paint). */
export function shouldTransformBeforeRowRebuild(
  prevStart: number,
  prevEnd: number,
  nextStart: number,
  nextEnd: number,
  minOverlapRows = 1,
): boolean {
  if (prevStart < 0 || prevEnd < 0) return true;
  return countRangeOverlap(prevStart, prevEnd, nextStart, nextEnd) >= minOverlapRows;
}

/** px/ms — above this, render rows before committing native scrollTop. */
export const SYNC_SCROLL_VELOCITY_THRESHOLD_PX_MS = 2;

export interface SyncScrollBeforePaintInput {
  appliedRowStart: number;
  appliedRowEnd: number;
  nextRowStart: number;
  nextRowEnd: number;
  scrollVelocityPxMs: number;
  /** True while pointer is down on the native vertical scrollbar. */
  isScrollbarDragging: boolean;
  /** Native scrollbar path (gutter pointer, drag flag, or large non-wheel jump). */
  isNativeScrollbarScroll: boolean;
  /** Absolute scrollTop delta from last committed store position (px). */
  scrollDeltaPx: number;
  rowHeight: number;
}

/**
 * Tier 2 sync scroll: hold native scrollTop until row pool catches up.
 * Triggers on native scrollbar, non-overlapping range jumps, or high velocity.
 */
export function shouldSyncScrollBeforePaint(input: SyncScrollBeforePaintInput): boolean {
  const { appliedRowStart, appliedRowEnd, nextRowStart, nextRowEnd } = input;
  if (appliedRowStart < 0 || appliedRowEnd < 0) return false;

  if (input.isNativeScrollbarScroll) return true;
  if (input.scrollDeltaPx >= input.rowHeight) return true;

  const overlap = countRangeOverlap(appliedRowStart, appliedRowEnd, nextRowStart, nextRowEnd);
  if (overlap === 0) return true;
  if (input.isScrollbarDragging) return true;
  if (input.scrollVelocityPxMs >= SYNC_SCROLL_VELOCITY_THRESHOLD_PX_MS) return true;
  return false;
}
