import { describe, expect, it } from "vitest";
import { commitCellEdit } from "./commit-cell-edit.js";
import type { ColumnDef } from "../types/column.js";
import type { RowNode } from "../types/row.js";

interface Row {
  age: number;
  name: string;
}

function node(data: Row, rowIndex = 0): RowNode<Row> {
  return {
    id: "1",
    data,
    rowIndex,
    level: 0,
    expanded: false,
    selected: false,
    group: false,
  };
}

describe("commitCellEdit", () => {
  it("applies valueParser before valueSetter", () => {
    const data: Row = { age: 10, name: "Ann" };
    const colDef: ColumnDef<Row> = {
      field: "age",
      valueParser: ({ newValue }) => Number(newValue),
    };

    const result = commitCellEdit(node(data), colDef, "42", null, null);
    expect(result).toMatchObject({ committed: true, oldValue: 10, newValue: 42 });
    expect(data.age).toBe(42);
  });

  it("rejects commit when valueSetter returns false", () => {
    const data: Row = { age: 10, name: "Ann" };
    const colDef: ColumnDef<Row> = {
      field: "age",
      valueSetter: () => false,
    };

    const result = commitCellEdit(node(data), colDef, "99", null, null);
    expect(result.committed).toBe(false);
    expect(data.age).toBe(10);
  });

  it("treats unchanged parsed values as a successful no-op commit", () => {
    const data: Row = { age: 10, name: "Ann" };
    const colDef: ColumnDef<Row> = { field: "age" };

    const result = commitCellEdit(node(data), colDef, "10", null, null);
    expect(result).toMatchObject({ committed: true, oldValue: 10, newValue: 10 });
    expect(data.age).toBe(10);
  });
});
