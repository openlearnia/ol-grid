import { describe, expect, it } from "vitest";
import { reorderColumnDefsByLeafOrder } from "../reorder-column-defs.js";
import { flattenColumnDefs } from "../flatten-column-defs.js";
import type { ColumnDef } from "../../types/column.js";

describe("reorderColumnDefsByLeafOrder", () => {
  it("reorders column defs with valueGetter without throwing", () => {
    const valueGetter = ({ newValue }: { newValue: unknown }) => Number(newValue);
    const defs: ColumnDef[] = [
      { field: "id", headerName: "ID", valueGetter },
      { field: "name", headerName: "Name" },
      { field: "role", headerName: "Role", valueGetter },
    ];

    const reordered = reorderColumnDefsByLeafOrder(defs, ["role", "name", "id"]);
    expect(reordered.map((def) => def.field)).toEqual(["role", "name", "id"]);
    expect(reordered[0]!.valueGetter).toBe(valueGetter);
    expect(reordered[2]!.valueGetter).toBe(valueGetter);
  });

  it("reorders grouped column defs with valueGetter without throwing", () => {
    const valueGetter = ({ newValue }: { newValue: unknown }) => Number(newValue);
    const defs: ColumnDef[] = [
      { field: "id", headerName: "ID" },
      {
        headerName: "Person",
        children: [
          { field: "name", headerName: "Name", valueGetter },
          { field: "role", headerName: "Role" },
        ],
      },
    ];

    const reordered = reorderColumnDefsByLeafOrder(defs, ["id", "role", "name"], "role");
    expect(flattenColumnDefs(reordered).map((entry) => entry.colId)).toEqual([
      "id",
      "role",
      "name",
    ]);
    const nameDef = flattenColumnDefs(reordered).find((entry) => entry.colId === "name");
    expect(nameDef?.def.valueGetter).toBe(valueGetter);
  });

  it("reorders flat column defs", () => {
    const defs: ColumnDef[] = [
      { field: "id", headerName: "ID" },
      { field: "name", headerName: "Name" },
      { field: "role", headerName: "Role" },
    ];

    const reordered = reorderColumnDefsByLeafOrder(defs, ["role", "name", "id"]);
    expect(reordered.map((def) => def.field)).toEqual(["role", "name", "id"]);
  });

  it("reorders leaves within the same group", () => {
    const defs: ColumnDef[] = [
      { field: "id", headerName: "ID" },
      {
        headerName: "Person",
        children: [
          { field: "name", headerName: "Name" },
          { field: "role", headerName: "Role" },
        ],
      },
    ];

    const reordered = reorderColumnDefsByLeafOrder(defs, ["id", "role", "name"], "role");
    expect(flattenColumnDefs(reordered).map((entry) => entry.colId)).toEqual([
      "id",
      "role",
      "name",
    ]);
  });

  it("moves a grouped leaf before a leaf in another group", () => {
    const defs: ColumnDef[] = [
      {
        headerName: "Org",
        children: [
          { field: "role", headerName: "Role" },
          { field: "department", headerName: "Department" },
        ],
      },
      {
        headerName: "Timeline",
        children: [{ field: "joinDate", headerName: "Join" }],
      },
    ];

    const reordered = reorderColumnDefsByLeafOrder(defs, ["joinDate", "role", "department"], "joinDate");
    expect(flattenColumnDefs(reordered).map((entry) => entry.colId)).toEqual([
      "joinDate",
      "role",
      "department",
    ]);
  });

  it("moves a grouped leaf after a top-level center leaf (React demo status)", () => {
    const defs: ColumnDef[] = [
      {
        headerName: "Organization",
        groupId: "organization",
        children: [
          { field: "role", headerName: "Role" },
          { field: "department", headerName: "Department" },
        ],
      },
      { field: "salary", headerName: "Salary", pinned: "right" },
      { field: "status", headerName: "Status" },
    ];

    const reordered = reorderColumnDefsByLeafOrder(
      defs,
      ["department", "status", "role"],
      "role",
    );
    expect(flattenColumnDefs(reordered).map((entry) => entry.colId)).toEqual([
      "department",
      "salary",
      "status",
      "role",
    ]);
  });

  it("moves role after status with timeline group and pinned-right salary (React demo)", () => {
    const defs: ColumnDef[] = [
      { field: "id", headerName: "ID", width: 72, pinned: "left" },
      { field: "name", headerName: "Name", width: 140, pinned: "left" },
      {
        headerName: "Organization",
        groupId: "organization",
        children: [
          { field: "role", headerName: "Role" },
          { field: "department", headerName: "Department" },
          { field: "location", headerName: "Location" },
        ],
      },
      {
        headerName: "Timeline",
        groupId: "timeline",
        children: [
          { field: "joinDate", headerName: "Join date" },
          { field: "startYear", headerName: "Start" },
        ],
      },
      { field: "salary", headerName: "Salary", pinned: "right" },
      { field: "status", headerName: "Status" },
    ];

    const orderedColIds = [
      "id",
      "name",
      "department",
      "location",
      "joinDate",
      "startYear",
      "salary",
      "status",
      "role",
    ];
    const reordered = reorderColumnDefsByLeafOrder(
      defs,
      orderedColIds,
      "role",
      5,
      ["department", "location", "joinDate", "startYear", "status", "role"],
      0,
    );
    expect(flattenColumnDefs(reordered).map((entry) => entry.colId)).toEqual(orderedColIds);
  });
});
