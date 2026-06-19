import { describe, expect, it } from "vitest";
import { ColumnModel } from "../column/column-model.js";
import { findNextEditableCell } from "./find-next-editable-cell.js";
import type { RowNode } from "../types/row.js";

interface Person {
  id: number;
  name: string;
  role: string;
}

function row(data: Person, rowIndex: number): RowNode<Person> {
  return {
    id: String(data.id),
    data,
    rowIndex,
    level: 0,
    expanded: false,
    selected: false,
    group: false,
  };
}

describe("findNextEditableCell", () => {
  const model = new ColumnModel<Person>();
  model.setColumnDefs([
    { field: "id", editable: false },
    { field: "name", editable: true },
    { field: "role", editable: true },
  ]);
  model.setColumnState([
    { colId: "id", width: 60 },
    { colId: "name", width: 120 },
    { colId: "role", width: 120 },
  ]);

  const rows = [
    row({ id: 1, name: "A", role: "Eng" }, 0),
    row({ id: 2, name: "B", role: "PM" }, 1),
  ];
  const columns = model.getColumns().filter((col) => !col.isSelectionColumn);

  it("moves forward to the next editable column", () => {
    const next = findNextEditableCell(
      { rowIndex: 0, colId: "name" },
      true,
      columns,
      (index) => rows[index],
      rows.length,
      null,
      null,
    );
    expect(next).toEqual({ rowIndex: 0, colId: "role" });
  });

  it("wraps to the next row when tabbing past the last editable column", () => {
    const next = findNextEditableCell(
      { rowIndex: 0, colId: "role" },
      true,
      columns,
      (index) => rows[index],
      rows.length,
      null,
      null,
    );
    expect(next).toEqual({ rowIndex: 1, colId: "name" });
  });

  it("moves backward with Shift+Tab", () => {
    const next = findNextEditableCell(
      { rowIndex: 1, colId: "name" },
      false,
      columns,
      (index) => rows[index],
      rows.length,
      null,
      null,
    );
    expect(next).toEqual({ rowIndex: 0, colId: "role" });
  });

  it("skips non-editable columns", () => {
    const next = findNextEditableCell(
      { rowIndex: 0, colId: "id" },
      true,
      columns,
      (index) => rows[index],
      rows.length,
      null,
      null,
    );
    expect(next).toEqual({ rowIndex: 0, colId: "name" });
  });
});
