import { describe, expect, it } from "vitest";
import {
  computeScrollVirtualRange,
  countRangeOverlap,
  createRowTransform,
  shouldSyncScrollBeforePaint,
  shouldTransformBeforeRowRebuild,
  SYNC_SCROLL_VELOCITY_THRESHOLD_PX_MS,
} from "./scroll-render.js";

describe("scroll-render", () => {
  it("creates row transform from offset", () => {
    expect(createRowTransform(224)).toBe("translate3d(0, 224px, 0)");
  });

  it("computes scroll virtual range via core virtualizer", () => {
    const range = computeScrollVirtualRange({
      rowCount: 100,
      rowHeight: 32,
      scrollTop: 480,
      viewportHeight: 200,
      overscanRowCount: 8,
    });
    expect(range.rowOffset).toBe(224);
    expect(range.rowStart).toBe(7);
  });

  it("counts range overlap for fast-path decisions", () => {
    expect(countRangeOverlap(5, 15, 10, 20)).toBe(6);
    expect(countRangeOverlap(5, 15, 20, 25)).toBe(0);
  });

  it("allows transform-before-rebuild when ranges overlap or on first paint", () => {
    expect(shouldTransformBeforeRowRebuild(-1, -1, 10, 20)).toBe(true);
    expect(shouldTransformBeforeRowRebuild(5, 15, 10, 20)).toBe(true);
    expect(shouldTransformBeforeRowRebuild(5, 15, 25, 35)).toBe(false);
  });

  it("requires sync scroll on non-overlap, high velocity, or scrollbar drag", () => {
    const base = {
      appliedRowStart: 5,
      appliedRowEnd: 15,
      nextRowStart: 25,
      nextRowEnd: 35,
      scrollVelocityPxMs: 0,
      isScrollbarDragging: false,
      isNativeScrollbarScroll: false,
      scrollDeltaPx: 0,
      rowHeight: 32,
    };
    expect(shouldSyncScrollBeforePaint(base)).toBe(true);

    expect(
      shouldSyncScrollBeforePaint({
        ...base,
        nextRowStart: 10,
        nextRowEnd: 20,
        scrollVelocityPxMs: SYNC_SCROLL_VELOCITY_THRESHOLD_PX_MS,
      }),
    ).toBe(true);

    expect(
      shouldSyncScrollBeforePaint({
        ...base,
        nextRowStart: 10,
        nextRowEnd: 20,
        scrollVelocityPxMs: 0,
        isScrollbarDragging: true,
      }),
    ).toBe(true);

    expect(
      shouldSyncScrollBeforePaint({
        ...base,
        nextRowStart: 10,
        nextRowEnd: 20,
        scrollVelocityPxMs: 0,
        isScrollbarDragging: false,
      }),
    ).toBe(false);

    expect(
      shouldSyncScrollBeforePaint({
        appliedRowStart: -1,
        appliedRowEnd: -1,
        nextRowStart: 0,
        nextRowEnd: 10,
        scrollVelocityPxMs: 100,
        isScrollbarDragging: true,
        isNativeScrollbarScroll: true,
        scrollDeltaPx: 500,
        rowHeight: 32,
      }),
    ).toBe(false);
  });

  it("requires sync scroll for native scrollbar and large track-click jumps", () => {
    const overlapping = {
      appliedRowStart: 5,
      appliedRowEnd: 20,
      nextRowStart: 8,
      nextRowEnd: 23,
      scrollVelocityPxMs: 0,
      isScrollbarDragging: false,
      isNativeScrollbarScroll: false,
      scrollDeltaPx: 16,
      rowHeight: 32,
    };
    expect(shouldSyncScrollBeforePaint(overlapping)).toBe(false);

    expect(
      shouldSyncScrollBeforePaint({
        ...overlapping,
        isNativeScrollbarScroll: true,
      }),
    ).toBe(true);

    expect(
      shouldSyncScrollBeforePaint({
        ...overlapping,
        scrollDeltaPx: 32,
      }),
    ).toBe(true);
  });
});
