import { describe, expect, it } from "vitest";
import type { RowNode } from "@ol-grid/core";
import { compareValues } from "../compare-values.js";
import {
  applySingleColumnSort,
  applySortModel,
  getSortModel,
  sortRowNodes,
  toggleColumnSort,
} from "../sort.js";

function node(id: string, value: unknown): RowNode<{ value: unknown }> {
  return {
    id,
    data: { value },
    rowIndex: 0,
    level: 0,
    expanded: false,
    selected: false,
    group: false,
  };
}

describe("compareValues", () => {
  it("sorts numbers and strings consistently", () => {
    expect(compareValues(2, 10)).toBeLessThan(0);
    expect(compareValues("b", "a")).toBeGreaterThan(0);
    expect(compareValues(null, "a")).toBeLessThan(0);
  });
});

describe("sortRowNodes", () => {
  it("sorts ascending and descending", () => {
    const rows = [node("c", 3), node("a", 1), node("b", 2)];
    const asc = sortRowNodes(rows, "asc", (row) => row.data?.value);
    expect(asc.map((row) => row.id)).toEqual(["a", "b", "c"]);

    const desc = sortRowNodes(rows, "desc", (row) => row.data?.value);
    expect(desc.map((row) => row.id)).toEqual(["c", "b", "a"]);
  });

  it("uses a custom comparator when provided", () => {
    const priorityOrder = ["Info", "Low", "High", "Critical"];
    const rows = [
      node("a", "Low"),
      node("b", "Critical"),
      node("c", "Info"),
      node("d", "High"),
    ];

    const sorted = sortRowNodes(
      rows,
      "asc",
      (row) => row.data?.value,
      (valueA, valueB) =>
        priorityOrder.indexOf(String(valueA)) - priorityOrder.indexOf(String(valueB)),
    );

    expect(sorted.map((row) => row.id)).toEqual(["c", "a", "d", "b"]);
  });
});

describe("toggleColumnSort", () => {
  it("cycles asc, desc, and clear", () => {
    expect(toggleColumnSort(null)).toBe("asc");
    expect(toggleColumnSort("asc")).toBe("desc");
    expect(toggleColumnSort("desc")).toBe(null);
  });
});

describe("applySingleColumnSort", () => {
  it("updates one column and clears others", () => {
    const columns = [
      { colId: "a", sort: "asc" as const, sortIndex: 0 },
      { colId: "b", sort: null, sortIndex: null },
    ];
    const next = applySingleColumnSort(columns, "b", "desc");
    expect(next).toEqual([
      { colId: "a", sort: null, sortIndex: null },
      { colId: "b", sort: "desc", sortIndex: 0 },
    ]);
    expect(getSortModel(next)).toEqual([{ colId: "b", sort: "desc" }]);
  });
});

describe("applySortModel", () => {
  it("applies multi-entry model to column state (single sort uses first entry)", () => {
    const columns = [
      { colId: "a", sort: null, sortIndex: null },
      { colId: "b", sort: null, sortIndex: null },
    ];
    const next = applySortModel(columns, [{ colId: "b", sort: "asc" }]);
    expect(getSortModel(next)).toEqual([{ colId: "b", sort: "asc" }]);
  });

  it("clears sort when model is empty", () => {
    const columns = [{ colId: "a", sort: "desc" as const, sortIndex: 0 }];
    const next = applySortModel(columns, []);
    expect(getSortModel(next)).toEqual([]);
  });
});
