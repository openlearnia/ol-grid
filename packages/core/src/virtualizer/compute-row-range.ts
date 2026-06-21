export const DEFAULT_OVERSCAN_ROW_COUNT = 3;

/** Extra rows rendered ahead in the active scroll direction (MUI DataGrid pattern). */
export const DIRECTIONAL_SCROLL_BUFFER_ROWS = 12;

/** Idle period after last scroll movement before shrinking to default overscan. */
export const SCROLL_SETTLE_MS = 150;

/** Max velocity-based boost stacked on directional buffer during fast flings. */
export const DIRECTIONAL_VELOCITY_MAX_BOOST = 15;

export type ScrollDirection = "up" | "down" | "none";

export interface RowVirtualRangeInput {
  rowCount: number;
  rowHeight: number;
  scrollTop: number;
  viewportHeight: number;
  overscanRowCount?: number;
  /** Extra rows above the viewport (legacy additive API). */
  extraOverscanBefore?: number;
  /** Extra rows below the viewport (legacy additive API). */
  extraOverscanAfter?: number;
  /** When set, replaces `overscanRowCount + extraOverscanBefore`. */
  overscanBefore?: number;
  /** When set, replaces `overscanRowCount + extraOverscanAfter`. */
  overscanAfter?: number;
}

export interface ScrollOverscanState {
  scrollTop: number;
  lastMovementTime: number;
  direction: ScrollDirection;
}

export interface DirectionalOverscanResult {
  overscanBefore: number;
  overscanAfter: number;
  nextState: ScrollOverscanState;
  isActiveScroll: boolean;
}

/** Estimate extra overscan rows from scroll velocity (px/ms) for fast flings. */
export function computeVelocityOverscanBoost(
  scrollDeltaPx: number,
  deltaMs: number,
  rowHeight: number,
  maxBoost = DIRECTIONAL_VELOCITY_MAX_BOOST,
): number {
  if (rowHeight <= 0 || deltaMs <= 0 || scrollDeltaPx <= 0) return 0;
  const rowsPerMs = scrollDeltaPx / rowHeight / deltaMs;
  // Look ahead ~2 frames (~32ms) of momentum scroll.
  return Math.min(Math.ceil(rowsPerMs * 32), maxBoost);
}

/**
 * MUI DataGrid-style directional buffer: small symmetric overscan when idle;
 * heavy one-sided buffer in scroll direction until scroll settles.
 */
export function computeDirectionalOverscan(
  scrollTop: number,
  state: ScrollOverscanState,
  now: number,
  rowHeight: number,
  deltaMs?: number,
): DirectionalOverscanResult {
  const base = DEFAULT_OVERSCAN_ROW_COUNT;
  let { lastMovementTime, direction } = state;
  const delta = scrollTop - state.scrollTop;

  if (delta !== 0) {
    direction = delta > 0 ? "down" : "up";
    lastMovementTime = now;
  }

  const idleMs = lastMovementTime > 0 ? now - lastMovementTime : Number.POSITIVE_INFINITY;
  const isActiveScroll = idleMs < SCROLL_SETTLE_MS;

  const nextState: ScrollOverscanState = {
    scrollTop,
    lastMovementTime,
    direction: isActiveScroll ? direction : "none",
  };

  if (!isActiveScroll) {
    return {
      overscanBefore: base,
      overscanAfter: base,
      nextState,
      isActiveScroll: false,
    };
  }

  const frameDeltaMs = deltaMs ?? (delta !== 0 ? 16 : 0);
  const velocityBoost =
    delta !== 0 && frameDeltaMs > 0
      ? computeVelocityOverscanBoost(
          Math.abs(delta),
          Math.max(frameDeltaMs, 16),
          rowHeight,
          DIRECTIONAL_VELOCITY_MAX_BOOST,
        )
      : 0;
  const buffer = DIRECTIONAL_SCROLL_BUFFER_ROWS + velocityBoost;

  if (direction === "down") {
    return {
      overscanBefore: 0,
      overscanAfter: buffer,
      nextState,
      isActiveScroll: true,
    };
  }

  if (direction === "up") {
    return {
      overscanBefore: buffer,
      overscanAfter: 0,
      nextState,
      isActiveScroll: true,
    };
  }

  return {
    overscanBefore: base,
    overscanAfter: base,
    nextState,
    isActiveScroll: true,
  };
}

/** Absolute overscan counts for pre-scroll warm-up from wheel / scrollbar intent. */
export function overscanForScrollIntent(direction: "up" | "down" | "both"): {
  overscanBefore: number;
  overscanAfter: number;
} {
  const buffer = DIRECTIONAL_SCROLL_BUFFER_ROWS;
  if (direction === "down") {
    return { overscanBefore: DEFAULT_OVERSCAN_ROW_COUNT, overscanAfter: buffer };
  }
  if (direction === "up") {
    return { overscanBefore: buffer, overscanAfter: DEFAULT_OVERSCAN_ROW_COUNT };
  }
  return {
    overscanBefore: DEFAULT_OVERSCAN_ROW_COUNT + buffer,
    overscanAfter: DEFAULT_OVERSCAN_ROW_COUNT + buffer,
  };
}

export interface RowVirtualRange {
  rowStart: number;
  rowEnd: number;
  rowOffset: number;
  totalHeight: number;
}

export function getFirstVisibleRowIndex(scrollTop: number, rowHeight: number): number {
  if (rowHeight <= 0) return 0;
  return Math.max(0, Math.floor(scrollTop / rowHeight));
}

export function computeRowVirtualRange(input: RowVirtualRangeInput): RowVirtualRange {
  const { rowCount, rowHeight, scrollTop, viewportHeight } = input;
  const defaultOverscan = input.overscanRowCount ?? DEFAULT_OVERSCAN_ROW_COUNT;
  const overscanBefore =
    input.overscanBefore ??
    defaultOverscan + (input.extraOverscanBefore ?? 0);
  const overscanAfter =
    input.overscanAfter ?? defaultOverscan + (input.extraOverscanAfter ?? 0);
  const totalHeight = rowCount * rowHeight;

  if (rowCount === 0 || rowHeight <= 0) {
    return { rowStart: 0, rowEnd: -1, rowOffset: 0, totalHeight: 0 };
  }

  const firstVisible = getFirstVisibleRowIndex(scrollTop, rowHeight);
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + 1;
  const rowStart = Math.max(0, firstVisible - overscanBefore);
  const rowEnd = Math.min(rowCount - 1, firstVisible + visibleCount + overscanAfter);
  const rowOffset = rowStart * rowHeight;

  return { rowStart, rowEnd, rowOffset, totalHeight };
}
