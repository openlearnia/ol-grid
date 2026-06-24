import { describe, expect, it } from "vitest";
import { ColumnModel } from "../column-model.js";

describe("ColumnModel sizeColumnsToFit", () => {
  it("scales center fixed columns to fill viewport", () => {
    const model = new ColumnModel();
    model.setColumnDefs([
      { field: "id", headerName: "ID", width: 100, pinned: "left" },
      { field: "name", headerName: "Name", width: 200 },
      { field: "role", headerName: "Role", width: 200 },
    ]);
    model.setViewportWidth(800);
    model.sizeColumnsToFit();

    const center = model.getCenterColumns();
    const centerTotal = center.reduce((sum, col) => sum + col.width, 0);
    expect(centerTotal).toBe(700);
  });
});
