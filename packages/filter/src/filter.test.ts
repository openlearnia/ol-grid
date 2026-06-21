import { describe, expect, it } from "vitest";
import { applyColumnFilters, isColumnFilterActive } from "./apply-column-filters.js";
import { doesDateFilterPass } from "./date-filter.js";
import { doesNumberFilterPass } from "./number-filter.js";
import { doesTextFilterPass } from "./text-filter.js";
import type { RowNode } from "@ol-grid/core";

interface Person {
  name: string;
  salary: number;
  startYear: number;
}

function node(data: Person, index = 0): RowNode<Person> {
  return {
    id: String(index),
    data,
    rowIndex: index,
    level: 0,
    expanded: false,
    selected: false,
    group: false,
  };
}

describe("text filter", () => {
  it("matches contains case-insensitively", () => {
    expect(
      doesTextFilterPass("Engineer", {
        filterType: "text",
        type: "contains",
        filter: "eng",
      }),
    ).toBe(true);
    expect(
      doesTextFilterPass("Designer", {
        filterType: "text",
        type: "contains",
        filter: "eng",
      }),
    ).toBe(false);
  });
});

describe("number filter", () => {
  it("supports greaterThan and inRange", () => {
    expect(
      doesNumberFilterPass(90000, {
        filterType: "number",
        type: "greaterThan",
        filter: 80000,
      }),
    ).toBe(true);
    expect(
      doesNumberFilterPass(70000, {
        filterType: "number",
        type: "inRange",
        filter: 70000,
        filterTo: 85000,
      }),
    ).toBe(true);
  });
});

describe("date filter", () => {
  it("matches equals on same calendar day", () => {
    expect(
      doesDateFilterPass("2020-06-15T14:00:00", {
        filterType: "date",
        type: "equals",
        dateFrom: "2020-06-15",
      }),
    ).toBe(true);
  });
});

describe("applyColumnFilters", () => {
  const columnDefs = [
    { field: "name" as const, filter: "text" as const },
    { field: "salary" as const, filter: "number" as const },
  ];

  const rows = [
    node({ name: "Alice", salary: 90000, startYear: 2018 }),
    node({ name: "Bob", salary: 70000, startYear: 2020 }, 1),
    node({ name: "Charlie", salary: 110000, startYear: 2015 }, 2),
  ];

  it("AND-composes active column filters", () => {
    const filtered = applyColumnFilters(
      rows,
      columnDefs,
      {
        name: { filterType: "text", type: "contains", filter: "a" },
        salary: { filterType: "number", type: "greaterThan", filter: 80000 },
      },
      null,
      null,
    );
    expect(filtered.map((row) => row.data?.name)).toEqual(["Alice", "Charlie"]);
  });

  it("treats inactive models as pass-through", () => {
    expect(isColumnFilterActive({ filterType: "text", type: "contains", filter: "" })).toBe(false);
    const filtered = applyColumnFilters(rows, columnDefs, {}, null, null);
    expect(filtered).toHaveLength(3);
  });

  it("filters 10k rows within a generous CI threshold", () => {
    const largeRows = Array.from({ length: 10_000 }, (_, index) =>
      node({ name: `User ${index}`, salary: index * 100, startYear: 2020 }, index),
    );

    const start = performance.now();
    const filtered = applyColumnFilters(
      largeRows,
      [{ field: "name" as const, filter: "text" as const }],
      { name: { filterType: "text", type: "contains", filter: "User 1" } },
      null,
      null,
    );
    const elapsed = performance.now() - start;

    expect(filtered.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(500);
  });
});
