import { describe, expect, it } from "vitest";
import { computeRowVirtualRange, getFirstVisibleRowIndex } from "./compute-row-range.js";

describe("computeRowVirtualRange", () => {
  const base = {
    rowCount: 100,
    rowHeight: 32,
    scrollTop: 0,
    viewportHeight: 320,
    overscanRowCount: 5,
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
    expect(range.rowEnd).toBe(16);
    expect(range.rowOffset).toBe(0);
    expect(range.totalHeight).toBe(3200);
  });

  it("shifts range and offset when scrolled", () => {
    const range = computeRowVirtualRange({ ...base, scrollTop: 320 });
    expect(range.rowStart).toBe(5);
    expect(range.rowEnd).toBe(26);
    expect(range.rowOffset).toBe(160);
  });

  it("clamps range at the end of the dataset", () => {
    const range = computeRowVirtualRange({ ...base, scrollTop: 3000 });
    expect(range.rowStart).toBe(88);
    expect(range.rowEnd).toBe(99);
    expect(range.rowOffset).toBe(2816);
  });
});
