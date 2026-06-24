import { describe, expect, it } from "vitest";
import {
  computeDirectionalOverscan,
  computeRowVirtualRange,
  computeVelocityOverscanBoost,
  DEFAULT_OVERSCAN_ROW_COUNT,
  DIRECTIONAL_SCROLL_BUFFER_ROWS,
  DIRECTIONAL_VELOCITY_MAX_BOOST,
  SCROLL_SETTLE_MS,
  getFirstVisibleRowIndex,
  type ScrollOverscanState,
} from "../compute-row-range.js";

describe("computeRowVirtualRange", () => {
  const base = {
    rowCount: 100,
    rowHeight: 32,
    scrollTop: 0,
    viewportHeight: 320,
    overscanRowCount: DEFAULT_OVERSCAN_ROW_COUNT,
  };

  it("returns empty range when rowCount is zero", () => {
    expect(computeRowVirtualRange({ ...base, rowCount: 0 })).toEqual({
      rowStart: 0,
      rowEnd: -1,
      rowOffset: 0,
      totalHeight: 0,
    });
  });

  it("returns first visible row index from scroll position", () => {
    expect(getFirstVisibleRowIndex(0, 32)).toBe(0);
    expect(getFirstVisibleRowIndex(320, 32)).toBe(10);
    expect(getFirstVisibleRowIndex(319, 32)).toBe(9);
  });

  it("computes initial visible range with overscan", () => {
    const range = computeRowVirtualRange(base);
    expect(range.rowStart).toBe(0);
    expect(range.rowEnd).toBe(14);
    expect(range.rowOffset).toBe(0);
    expect(range.totalHeight).toBe(3200);
  });

  it("shifts range and offset when scrolled", () => {
    const range = computeRowVirtualRange({ ...base, scrollTop: 320 });
    expect(range.rowStart).toBe(7);
    expect(range.rowEnd).toBe(24);
    expect(range.rowOffset).toBe(224);
  });

  it("clamps range at the end of the dataset", () => {
    const range = computeRowVirtualRange({ ...base, scrollTop: 3000 });
    expect(range.rowStart).toBe(90);
    expect(range.rowEnd).toBe(99);
    expect(range.rowOffset).toBe(2880);
  });

  it("extends range directionally with explicit overscan counts", () => {
    const baseRange = computeRowVirtualRange({ ...base, scrollTop: 640 });
    const boostedBelow = computeRowVirtualRange({
      ...base,
      scrollTop: 640,
      overscanBefore: baseRange.rowStart > 0 ? DEFAULT_OVERSCAN_ROW_COUNT : 0,
      overscanAfter: DEFAULT_OVERSCAN_ROW_COUNT + 10,
    });
    expect(boostedBelow.rowStart).toBe(baseRange.rowStart);
    expect(boostedBelow.rowEnd).toBe(baseRange.rowEnd + 10);

    const boostedAbove = computeRowVirtualRange({
      ...base,
      scrollTop: 640,
      overscanBefore: DEFAULT_OVERSCAN_ROW_COUNT + 10,
      overscanAfter: DEFAULT_OVERSCAN_ROW_COUNT,
    });
    expect(boostedAbove.rowStart).toBe(baseRange.rowStart - 10);
    expect(boostedAbove.rowEnd).toBe(baseRange.rowEnd);
  });

  it("computes velocity overscan boost from scroll speed", () => {
    // 640px in 16ms at 32px row height = 20 rows/ms * 32ms lookahead = 40, capped at 15
    expect(computeVelocityOverscanBoost(640, 16, 32)).toBe(DIRECTIONAL_VELOCITY_MAX_BOOST);
    expect(computeVelocityOverscanBoost(0, 16, 32)).toBe(0);
    expect(computeVelocityOverscanBoost(64, 0, 32)).toBe(0);
    // 160px in 16ms = 5 rows/ms * 32 = 10 rows boost
    expect(computeVelocityOverscanBoost(160, 16, 32)).toBe(10);
  });
});

describe("computeDirectionalOverscan", () => {
  const idleState: ScrollOverscanState = {
    scrollTop: 320,
    lastMovementTime: 0,
    direction: "none",
  };

  it("uses small symmetric overscan when idle", () => {
    const now = 10_000;
    const result = computeDirectionalOverscan(320, idleState, now, 32);
    expect(result.overscanBefore).toBe(DEFAULT_OVERSCAN_ROW_COUNT);
    expect(result.overscanAfter).toBe(DEFAULT_OVERSCAN_ROW_COUNT);
    expect(result.isActiveScroll).toBe(false);
  });

  it("scrolling down expands after, not before", () => {
    const now = 1_000;
    const state: ScrollOverscanState = { scrollTop: 280, lastMovementTime: now - 16, direction: "none" };
    const result = computeDirectionalOverscan(320, state, now, 32, 16);

    expect(result.overscanBefore).toBe(0);
    expect(result.overscanAfter).toBeGreaterThanOrEqual(DIRECTIONAL_SCROLL_BUFFER_ROWS);
    expect(result.overscanAfter).toBeGreaterThan(result.overscanBefore);
    expect(result.isActiveScroll).toBe(true);
    expect(result.nextState.direction).toBe("down");
  });

  it("scrolling up expands before, not after", () => {
    const now = 1_000;
    const state: ScrollOverscanState = { scrollTop: 320, lastMovementTime: now - 16, direction: "none" };
    const result = computeDirectionalOverscan(280, state, now, 32, 16);

    expect(result.overscanAfter).toBe(0);
    expect(result.overscanBefore).toBeGreaterThanOrEqual(DIRECTIONAL_SCROLL_BUFFER_ROWS);
    expect(result.overscanBefore).toBeGreaterThan(result.overscanAfter);
    expect(result.nextState.direction).toBe("up");
  });

  it("maintains directional buffer between scroll events until settle", () => {
    const now = 2_000;
    const afterMove = computeDirectionalOverscan(
      320,
      { scrollTop: 280, lastMovementTime: now - 32, direction: "none" },
      now - 16,
      32,
      16,
    );
    const betweenEvents = computeDirectionalOverscan(320, afterMove.nextState, now, 32);

    expect(betweenEvents.overscanBefore).toBe(0);
    expect(betweenEvents.overscanAfter).toBeGreaterThanOrEqual(DIRECTIONAL_SCROLL_BUFFER_ROWS);
    expect(betweenEvents.isActiveScroll).toBe(true);
  });

  it("shrinks buffer after scroll settles", () => {
    const movementTime = 4_000;
    const activeAt = movementTime + 16;
    const now = activeAt + SCROLL_SETTLE_MS + 1;
    const active = computeDirectionalOverscan(
      640,
      { scrollTop: 600, lastMovementTime: movementTime, direction: "down" },
      activeAt,
      32,
      16,
    );
    expect(active.isActiveScroll).toBe(true);

    const settled = computeDirectionalOverscan(640, active.nextState, now, 32);
    expect(settled.isActiveScroll).toBe(false);
    expect(settled.overscanBefore).toBe(DEFAULT_OVERSCAN_ROW_COUNT);
    expect(settled.overscanAfter).toBe(DEFAULT_OVERSCAN_ROW_COUNT);
  });

  it("applies directional buffer to virtual range — down scroll extends rowEnd only", () => {
    const viewport = { rowCount: 500, rowHeight: 32, scrollTop: 640, viewportHeight: 320 };
    const idleRange = computeRowVirtualRange({
      ...viewport,
      overscanBefore: DEFAULT_OVERSCAN_ROW_COUNT,
      overscanAfter: DEFAULT_OVERSCAN_ROW_COUNT,
    });
    const downScroll = computeDirectionalOverscan(
      640,
      { scrollTop: 600, lastMovementTime: 900, direction: "none" },
      916,
      32,
      16,
    );
    const activeRange = computeRowVirtualRange({
      ...viewport,
      overscanBefore: downScroll.overscanBefore,
      overscanAfter: downScroll.overscanAfter,
    });

    expect(activeRange.rowStart).toBeGreaterThanOrEqual(idleRange.rowStart);
    expect(activeRange.rowEnd).toBeGreaterThan(idleRange.rowEnd);
    expect(activeRange.rowStart - idleRange.rowStart).toBeGreaterThanOrEqual(0);
  });
});
