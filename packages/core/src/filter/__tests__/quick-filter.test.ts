import { describe, expect, it } from "vitest";
import {
  filterRowsByQuickFilter,
  normalizeQuickFilterText,
  rowMatchesQuickFilter,
} from "../quick-filter.js";
import type { ColumnDef } from "../../types/column.js";
import type { RowNode } from "../../types/row.js";

interface Row {
  name: string;
  role: string;
  salary: number;
}

function node(data: Row, index: number): RowNode<Row> {
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

const columnDefs: ColumnDef<Row>[] = [
  { field: "name", headerName: "Name" },
  { field: "role", headerName: "Role" },
  {
    field: "salary",
    headerName: "Salary",
    valueFormatter: ({ value }) => `$${value}`,
  },
];

describe("quick filter", () => {
  it("normalizes filter text", () => {
    expect(normalizeQuickFilterText("  Hello  ")).toBe("hello");
  });

  it("matches any column display value", () => {
    const rows = [
      node({ name: "Alice", role: "Engineer", salary: 90000 }, 0),
      node({ name: "Bob", role: "Designer", salary: 80000 }, 1),
    ];

    expect(rowMatchesQuickFilter(rows[0]!, columnDefs, "engineer", null, null)).toBe(true);
    expect(rowMatchesQuickFilter(rows[1]!, columnDefs, "alice", null, null)).toBe(false);
    expect(rowMatchesQuickFilter(rows[1]!, columnDefs, "$80000", null, null)).toBe(true);
  });

  it("returns all rows when filter is empty", () => {
    const rows = [
      node({ name: "Alice", role: "Engineer", salary: 90000 }, 0),
      node({ name: "Bob", role: "Designer", salary: 80000 }, 1),
    ];

    expect(filterRowsByQuickFilter(rows, columnDefs, "", null, null)).toHaveLength(2);
    expect(filterRowsByQuickFilter(rows, columnDefs, "   ", null, null)).toHaveLength(2);
  });

  it("filters rows by quick filter text", () => {
    const rows = [
      node({ name: "Alice", role: "Engineer", salary: 90000 }, 0),
      node({ name: "Bob", role: "Designer", salary: 80000 }, 1),
      node({ name: "Carol", role: "Engineer", salary: 95000 }, 2),
    ];

    const filtered = filterRowsByQuickFilter(rows, columnDefs, "designer", null, null);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.data?.name).toBe("Bob");
  });
});
