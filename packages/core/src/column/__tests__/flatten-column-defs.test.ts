import { describe, expect, it } from "vitest";
import { flattenColumnDefs, isColumnGroup } from "../flatten-column-defs.js";
import type { ColumnDef } from "../../types/column.js";

describe("flattenColumnDefs", () => {
  it("flattens nested children in visual order", () => {
    const defs: ColumnDef[] = [
      { field: "id", headerName: "ID" },
      {
        headerName: "Person",
        children: [
          { field: "name", headerName: "Name" },
          { field: "role", headerName: "Role" },
        ],
      },
      { field: "salary", headerName: "Salary" },
    ];

    expect(isColumnGroup(defs[1]!)).toBe(true);
    const flat = flattenColumnDefs(defs);
    expect(flat.map((entry) => entry.colId)).toEqual(["id", "name", "role", "salary"]);
  });
});
