import { describe, expect, it } from "vitest";
import {
  clampPage,
  computeAutoPageSize,
  computeTotalPages,
  normalizePageSize,
  slicePageRows,
} from "../pagination.js";

describe("pagination helpers", () => {
  it("computes total pages", () => {
    expect(computeTotalPages(237, 50)).toBe(5);
    expect(computeTotalPages(0, 50)).toBe(1);
  });

  it("clamps page index", () => {
    expect(clampPage(5, 5)).toBe(4);
    expect(clampPage(-1, 5)).toBe(0);
  });

  it("slices page rows", () => {
    const rows = Array.from({ length: 237 }, (_, index) => index);
    expect(slicePageRows(rows, 4, 50)).toHaveLength(37);
    expect(slicePageRows(rows, 4, 50)[0]).toBe(200);
  });

  it("normalizes page size", () => {
    expect(normalizePageSize(0)).toBe(1);
    expect(normalizePageSize(25.9)).toBe(25);
  });

  it("computes auto page size from viewport and row height", () => {
    expect(computeAutoPageSize(320, 32)).toBe(10);
    expect(computeAutoPageSize(0, 32)).toBe(1);
    expect(computeAutoPageSize(100, 0)).toBe(1);
  });
});
