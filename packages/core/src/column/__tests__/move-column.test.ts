import { describe, expect, it } from "vitest";
import { computeColumnMove, getColumnPinRegion } from "../move-column.js";
import { isColumnMovable } from "../is-column-movable.js";
import type { ColumnDef } from "../../types/column.js";

interface Row {
  id: number;
  name: string;
  role: string;
  salary: number;
}

const flatColumns: Array<{
  colId: string;
  pinned: "left" | "right" | null;
  def: ColumnDef<Row>;
}> = [
  { colId: "id", pinned: "left", def: { field: "id" } },
  { colId: "name", pinned: null, def: { field: "name" } },
  { colId: "role", pinned: null, def: { field: "role" } },
  { colId: "salary", pinned: "right", def: { field: "salary" } },
];

describe("getColumnPinRegion", () => {
  it("maps pinned values to regions", () => {
    expect(getColumnPinRegion("left")).toBe("left");
    expect(getColumnPinRegion("right")).toBe("right");
    expect(getColumnPinRegion(null)).toBe("center");
  });
});

describe("isColumnMovable", () => {
  it("respects suppressMovable, lockPosition, and grid suppressColumnMove", () => {
    const def: ColumnDef = { field: "name" };
    expect(isColumnMovable(def)).toBe(true);
    expect(isColumnMovable({ ...def, suppressMovable: true })).toBe(false);
    expect(isColumnMovable({ ...def, lockPosition: true })).toBe(false);
    expect(isColumnMovable(def, { suppressColumnMove: true })).toBe(false);
  });
});

describe("computeColumnMove", () => {
  it("reorders within center region without crossing pin boundaries", () => {
    const result = computeColumnMove(flatColumns, "role", 0);
    expect(result?.orderedColIds).toEqual(["id", "role", "name", "salary"]);
    expect(result?.toIndex).toBe(0);
  });

  it("reorders within pinned-left region", () => {
    const columns: Array<{ colId: string; pinned: "left" | null; def: ColumnDef<Row> }> = [
      { colId: "a", pinned: "left", def: { field: "id" } },
      { colId: "b", pinned: "left", def: { field: "name" } },
      { colId: "c", pinned: null, def: { field: "role" } },
    ];
    const result = computeColumnMove(columns, "b", 0);
    expect(result?.orderedColIds).toEqual(["b", "a", "c"]);
  });

  it("returns null for selection column, locked columns, and no-op moves", () => {
    expect(
      computeColumnMove(
        [{ colId: "__selection__", pinned: "left", def: {}, isSelectionColumn: true }],
        "__selection__",
        0,
      ),
    ).toBeNull();

    expect(
      computeColumnMove(
        [{ colId: "name", pinned: null, def: { field: "name", lockPosition: true } }],
        "name",
        0,
      ),
    ).toBeNull();

    expect(computeColumnMove(flatColumns, "name", 0)).toBeNull();
  });

  it("uses flatten order when center columns are declared after pinned-right", () => {
    const columns: Array<{ colId: string; pinned: "left" | "right" | null; def: ColumnDef<Row> }> =
      [
        { colId: "id", pinned: "left", def: { field: "id" } },
        { colId: "name", pinned: "left", def: { field: "name" } },
        { colId: "role", pinned: null, def: { field: "role" } },
        { colId: "department", pinned: null, def: { field: "department" } },
        { colId: "salary", pinned: "right", def: { field: "salary" } },
        { colId: "status", pinned: null, def: { field: "status" } },
      ];
    const flattenOrder = [
      "id",
      "name",
      "role",
      "department",
      "salary",
      "status",
    ];

    const result = computeColumnMove(columns, "role", 1, {}, flattenOrder);
    expect(result?.orderedColIds).toEqual([
      "id",
      "name",
      "department",
      "role",
      "salary",
      "status",
    ]);
  });

  it("computes move for role after status in grouped React demo layout", () => {
    const columns: Array<{
      colId: string;
      pinned: "left" | "right" | null;
      def: ColumnDef<Row>;
    }> = [
      { colId: "id", pinned: "left", def: { field: "id" } },
      { colId: "name", pinned: "left", def: { field: "name" } },
      { colId: "role", pinned: null, def: { field: "role" } },
      { colId: "department", pinned: null, def: { field: "department" } },
      { colId: "location", pinned: null, def: { field: "location" } },
      { colId: "joinDate", pinned: null, def: { field: "joinDate" } },
      { colId: "startYear", pinned: null, def: { field: "startYear" } },
      { colId: "salary", pinned: "right", def: { field: "salary" } },
      { colId: "status", pinned: null, def: { field: "status" } },
    ];
    const flattenOrder = [
      "id",
      "name",
      "role",
      "department",
      "location",
      "joinDate",
      "startYear",
      "salary",
      "status",
    ];

    const result = computeColumnMove(columns, "role", 5, {}, flattenOrder);
    expect(result?.orderedColIds).toEqual([
      "id",
      "name",
      "department",
      "location",
      "joinDate",
      "startYear",
      "status",
      "salary",
      "role",
    ]);
  });
});
