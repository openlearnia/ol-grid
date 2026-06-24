import { describe, expect, it } from "vitest";
import { buildHeaderRows } from "../build-header-rows.js";
import { ColumnModel } from "../column-model.js";
import type { ColumnDef } from "../../types/column.js";

describe("buildHeaderRows", () => {
  it("renders two-level group headers with correct colspan widths", () => {
    const columnDefs: ColumnDef[] = [
      { field: "id", headerName: "ID", width: 72, pinned: "left" },
      {
        headerName: "Employee",
        groupId: "employee",
        children: [
          { field: "name", headerName: "Name", width: 140 },
          { field: "role", headerName: "Role", width: 120 },
        ],
      },
      { field: "salary", headerName: "Salary", width: 110 },
    ];

    const model = new ColumnModel();
    model.setColumnDefs(columnDefs);
    model.setViewportWidth(900);

    const headers = buildHeaderRows({
      columnDefs,
      columns: model.getColumns(),
      filterModel: {},
      includeSelectionColumn: false,
    });

    expect(headers.rowCount).toBe(2);
    expect(headers.center[0]!.cells).toHaveLength(2);
    expect(headers.center[0]!.cells[0]!.kind).toBe("group");
    expect(headers.center[0]!.cells[0]!.headerName).toBe("Employee");
    expect(headers.center[0]!.cells[0]!.width).toBe(260);
    expect(headers.center[0]!.cells[0]!.colSpan).toBe(2);
    expect(headers.center[0]!.cells[1]!.kind).toBe("leaf");
    expect(headers.center[0]!.cells[1]!.colId).toBe("salary");
    expect(headers.center[0]!.cells[1]!.rowSpan).toBe(2);
    expect(headers.center[1]!.cells.map((cell) => cell.colId)).toEqual(["name", "role"]);
  });

  it("routes flex center and pinned-right headers when salary precedes status in defs", () => {
    const columnDefs: ColumnDef[] = [
      { field: "id", headerName: "ID", width: 72, pinned: "left" },
      {
        headerName: "Organization",
        groupId: "organization",
        children: [
          { field: "role", headerName: "Role", width: 120 },
          { field: "department", headerName: "Department", width: 130 },
        ],
      },
      {
        field: "salary",
        headerName: "Salary",
        width: 110,
        pinned: "right",
      },
      {
        field: "status",
        headerName: "Status",
        flex: 1,
      },
    ];

    const model = new ColumnModel();
    model.setColumnDefs(columnDefs);
    model.setViewportWidth(900);

    const headers = buildHeaderRows({
      columnDefs,
      columns: model.getColumns(),
      filterModel: {},
      includeSelectionColumn: false,
    });

    const centerLeafColIds = headers.center
      .flatMap((row) => row.cells)
      .filter((cell) => cell.kind === "leaf")
      .map((cell) => cell.colId);
    const rightLeafColIds = headers.pinnedRight
      .flatMap((row) => row.cells)
      .filter((cell) => cell.kind === "leaf")
      .map((cell) => cell.colId);

    expect(centerLeafColIds).toContain("status");
    expect(centerLeafColIds).not.toContain("salary");
    expect(rightLeafColIds).toEqual(["salary"]);

    const statusHeader = headers.center
      .flatMap((row) => row.cells)
      .find((cell) => cell.colId === "status");
    const salaryHeader = headers.pinnedRight
      .flatMap((row) => row.cells)
      .find((cell) => cell.colId === "salary");

    expect(statusHeader?.headerName).toBe("Status");
    expect(salaryHeader?.headerName).toBe("Salary");
    expect(statusHeader?.pinned).toBeNull();
    expect(salaryHeader?.pinned).toBe("right");
  });
});
