import { describe, expect, it } from "vitest";
import { ColumnModel, SELECTION_COLUMN_WIDTH } from "../column-model.js";
import type { ColumnDef } from "../../types/column.js";

interface DemoRow {
  id: number;
  name: string;
  role: string;
  department: string;
  location: string;
  startYear: number;
  salary: number;
  status: string;
}

describe("ColumnModel widths", () => {
  const DEFAULT_COLUMN_WIDTH = 150;

  it("defaults to 150px when width is omitted", () => {
    const model = new ColumnModel<DemoRow>();
    model.setColumnDefs([{ field: "status", headerName: "Status" }]);
    model.setViewportWidth(800);

    const status = model.getCenterColumns().find((col) => col.colId === "status");
    expect(status?.width).toBe(DEFAULT_COLUMN_WIDTH);
    expect(model.getCenterWidth()).toBe(DEFAULT_COLUMN_WIDTH);
  });

  it("sums pinned and center widths into totalWidth", () => {
    const model = new ColumnModel<DemoRow>();
    model.setColumnDefs([
      { field: "id", headerName: "ID", width: 72, pinned: "left" },
      { field: "name", headerName: "Name", width: 140, pinned: "left" },
      { field: "status", headerName: "Status" },
    ]);
    model.setIncludeSelectionColumn(true);
    model.setViewportWidth(800);

    const pinnedWidth = model.getPinnedLeftColumns().reduce((sum, col) => sum + col.width, 0);
    const centerWidth = model.getCenterColumns().reduce((sum, col) => sum + col.width, 0);

    expect(pinnedWidth).toBe(SELECTION_COLUMN_WIDTH + 72 + 140);
    expect(centerWidth).toBe(DEFAULT_COLUMN_WIDTH);
    expect(model.getTotalWidth()).toBe(pinnedWidth + centerWidth);
    expect(model.getPinnedLeftWidth()).toBe(pinnedWidth);
    expect(model.getCenterWidth()).toBe(centerWidth);
  });

  it("allows center width to exceed center viewport when fixed columns overflow", () => {
    const model = new ColumnModel<DemoRow>();
    model.setColumnDefs([
      { field: "id", headerName: "ID", width: 72, pinned: "left" },
      { field: "name", headerName: "Name", width: 140, pinned: "left" },
      { field: "role", headerName: "Role", width: 120 },
      { field: "department", headerName: "Department", width: 130 },
      { field: "location", headerName: "Location", width: 110 },
      { field: "status", headerName: "Status" },
    ]);
    model.setIncludeSelectionColumn(true);
    model.setViewportWidth(500);

    const pinnedWidth = model.getPinnedLeftWidth();
    const centerWidth = model.getCenterWidth();
    const centerViewport = 500 - pinnedWidth;
    const status = model.getCenterColumns().find((col) => col.colId === "status");

    expect(centerWidth).toBeGreaterThan(centerViewport);
    expect(status?.width).toBe(DEFAULT_COLUMN_WIDTH);
    expect(model.getTotalWidth()).toBe(pinnedWidth + centerWidth);
  });

  it("fills remaining center viewport for explicit flex columns", () => {
    const model = new ColumnModel<DemoRow>();
    model.setColumnDefs([
      { field: "id", headerName: "ID", width: 72, pinned: "left" },
      { field: "name", headerName: "Name", width: 140, pinned: "left" },
      { field: "role", headerName: "Role", width: 120 },
      { field: "department", headerName: "Department", width: 130 },
      { field: "location", headerName: "Location", width: 110 },
      { field: "startYear", headerName: "Start", width: 90 },
      { field: "salary", headerName: "Salary", width: 110 },
      { field: "status", headerName: "Status", flex: 1 },
    ]);
    model.setIncludeSelectionColumn(true);
    model.setViewportWidth(1200);

    const pinnedWidth = model.getPinnedLeftWidth();
    const centerViewport = 1200 - pinnedWidth;
    const fixedCenter = 120 + 130 + 110 + 90 + 110;
    const status = model.getCenterColumns().find((col) => col.colId === "status");

    expect(model.getCenterWidth()).toBe(centerViewport);
    expect(status?.width).toBe(centerViewport - fixedCenter);
  });

  it("subtracts pinned-right width from center flex budget", () => {
    const model = new ColumnModel<DemoRow>();
    model.setColumnDefs([
      { field: "id", headerName: "ID", width: 72, pinned: "left" },
      { field: "name", headerName: "Name", width: 140 },
      { field: "status", headerName: "Status", flex: 1 },
      { field: "salary", headerName: "Salary", width: 110, pinned: "right" },
    ]);
    model.setViewportWidth(900);

    const pinnedRight = model.getPinnedRightColumns();
    const centerWidth = model.getCenterWidth();
    const centerViewport = model.getCenterViewportWidth();

    expect(pinnedRight.map((col) => col.colId)).toEqual(["salary"]);
    expect(model.getPinnedRightWidth()).toBe(110);
    expect(centerViewport).toBe(900 - model.getPinnedLeftWidth() - 110);
    expect(centerWidth).toBe(centerViewport);
    expect(model.getTotalWidth()).toBe(model.getPinnedLeftWidth() + centerWidth + 110);
  });

  it("keeps center width at column sum when fixed columns underflow viewport", () => {
    const model = new ColumnModel<DemoRow>();
    model.setColumnDefs([
      { field: "id", headerName: "ID", width: 72, pinned: "left" },
      { field: "name", headerName: "Name", width: 140, pinned: "left" },
      { field: "role", headerName: "Role", width: 120 },
      { field: "department", headerName: "Department", width: 130 },
      { field: "location", headerName: "Location", width: 110 },
      { field: "startYear", headerName: "Start", width: 90 },
      { field: "status", headerName: "Status", width: 120 },
      { field: "salary", headerName: "Salary", width: 110, pinned: "right" },
    ]);
    model.setViewportWidth(1200);

    const centerWidth = model.getCenterWidth();
    const centerViewport = model.getCenterViewportWidth();
    const pinnedLeftWidth = model.getPinnedLeftWidth();
    const pinnedRightWidth = model.getPinnedRightWidth();
    const totalWidth = pinnedLeftWidth + centerWidth + pinnedRightWidth;

    expect(centerWidth).toBe(120 + 130 + 110 + 90 + 120);
    expect(centerViewport).toBe(1200 - pinnedLeftWidth - pinnedRightWidth);
    expect(centerWidth).toBeLessThan(centerViewport);
    expect(model.getTotalWidth()).toBe(totalWidth);
    expect(model.getRenderWidth()).toBe(totalWidth);
  });

  it("uses viewport as render width when columns overflow", () => {
    const model = new ColumnModel<DemoRow>();
    model.setColumnDefs([
      { field: "id", headerName: "ID", width: 72, pinned: "left" },
      { field: "name", headerName: "Name", width: 140, pinned: "left" },
      { field: "role", headerName: "Role", width: 120 },
      { field: "department", headerName: "Department", width: 130 },
      { field: "location", headerName: "Location", width: 110 },
      { field: "startYear", headerName: "Start", width: 90 },
      { field: "status", headerName: "Status", width: 120 },
      { field: "salary", headerName: "Salary", width: 110, pinned: "right" },
    ]);
    model.setViewportWidth(500);

    expect(model.getTotalWidth()).toBeGreaterThan(500);
    expect(model.getRenderWidth()).toBe(500);
    expect(model.getCenterViewportWidth()).toBe(500 - model.getPinnedLeftWidth() - model.getPinnedRightWidth());
    expect(model.getCenterWidth()).toBeGreaterThan(model.getCenterViewportWidth());
  });
});
