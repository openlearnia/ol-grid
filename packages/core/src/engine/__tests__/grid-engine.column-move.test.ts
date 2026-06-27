/** @vitest-environment happy-dom */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { computeColumnMove } from "../../column/move-column.js";
import { flattenColumnDefs } from "../../column/flatten-column-defs.js";
import { createGridEngine } from "../grid-engine.js";

interface Person {
  id: number;
  name: string;
  role: string;
  salary: number;
}

describe("GridEngine column move", () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
  });

  afterEach(() => {
    host.remove();
  });

  it("moveColumn reorders center columns within pin region", () => {
    const engine = createGridEngine<Person>({
      columnDefs: [
        { field: "id", headerName: "ID", width: 72, pinned: "left" },
        { field: "name", headerName: "Name", width: 140 },
        { field: "role", headerName: "Role", width: 120 },
        { field: "salary", headerName: "Salary", width: 110, pinned: "right" },
      ],
      rowData: [{ id: 1, name: "Alice", role: "Engineer", salary: 100 }],
    });

    const moved = engine.moveColumn("role", 0);
    expect(moved).toBe(true);
    expect(engine.getColumnModel().getCenterColumns().map((col) => col.colId)).toEqual([
      "role",
      "name",
    ]);
    expect(engine.getColumnModel().getPinnedLeftColumns().map((col) => col.colId)).toEqual(["id"]);
    expect(engine.getColumnModel().getPinnedRightColumns().map((col) => col.colId)).toEqual([
      "salary",
    ]);
  });

  it("moveColumn emits onColumnMoved and displayedColumnsChanged", () => {
    const onColumnMoved = vi.fn();
    const onDisplayedColumnsChanged = vi.fn();

    const engine = createGridEngine<Person>({
      columnDefs: [
        { field: "name", headerName: "Name", width: 140 },
        { field: "role", headerName: "Role", width: 120 },
      ],
      rowData: [{ id: 1, name: "Alice", role: "Engineer", salary: 100 }],
      onColumnMoved,
      onDisplayedColumnsChanged,
    });

    engine.moveColumn("role", 0);

    expect(onColumnMoved).toHaveBeenCalledWith(
      expect.objectContaining({ colId: "role", toIndex: 0, finished: true }),
    );
    expect(onDisplayedColumnsChanged).toHaveBeenCalled();
  });

  it("moveColumn returns false for locked or suppressed columns", () => {
    const engine = createGridEngine<Person>({
      suppressColumnMove: true,
      columnDefs: [
        { field: "name", headerName: "Name", width: 140 },
        { field: "role", headerName: "Role", width: 120, lockPosition: true },
      ],
      rowData: [{ id: 1, name: "Alice", role: "Engineer", salary: 100 }],
    });

    expect(engine.moveColumn("name", 1)).toBe(false);

    engine.getApi().setGridOption("suppressColumnMove", false);
    expect(engine.moveColumn("role", 0)).toBe(false);
    expect(engine.getColumnModel().getCenterColumns().map((col) => col.colId)).toEqual([
      "name",
      "role",
    ]);
  });

  it("getApi().moveColumn reorders columns", () => {
    const engine = createGridEngine<Person>({
      columnDefs: [
        { field: "name", headerName: "Name", width: 140 },
        { field: "role", headerName: "Role", width: 120 },
      ],
      rowData: [{ id: 1, name: "Alice", role: "Engineer", salary: 100 }],
    });

    engine.getApi().moveColumn("role", 0);
    expect(engine.getColumnModel().getCenterColumns().map((col) => col.colId)).toEqual([
      "role",
      "name",
    ]);
  });

  it("moveColumn works when a center column is declared after pinned-right", () => {
    const engine = createGridEngine<Person>({
      rowSelection: "multiple",
      columnDefs: [
        { field: "id", headerName: "ID", width: 72, pinned: "left" },
        { field: "name", headerName: "Name", width: 140, pinned: "left" },
        {
          headerName: "Organization",
          children: [
            { field: "role", headerName: "Role", width: 120 },
            { field: "department", headerName: "Department", width: 130 },
          ],
        },
        { field: "salary", headerName: "Salary", width: 110, pinned: "right" },
        { field: "status", headerName: "Status", width: 120 },
      ],
      rowData: [{ id: 1, name: "Alice", role: "Engineer", department: "Eng", salary: 100, status: "ok" }],
    });

    expect(engine.moveColumn("role", 1)).toBe(true);
    expect(engine.getColumnModel().getCenterColumns().map((col) => col.colId)).toEqual([
      "department",
      "role",
      "status",
    ]);
    expect(engine.moveColumn("name", 0)).toBe(true);
    expect(engine.getColumnModel().getPinnedLeftColumns().map((col) => col.colId)).toEqual([
      "__selection__",
      "name",
      "id",
    ]);
  });

  it("moveColumn reorders role after status across group boundary (React demo)", () => {
    const engine = createGridEngine<Person>({
      rowSelection: "multiple",
      columnDefs: [
        { field: "id", headerName: "ID", width: 72, pinned: "left" },
        { field: "name", headerName: "Name", width: 140, pinned: "left" },
        {
          headerName: "Organization",
          groupId: "organization",
          children: [
            { field: "role", headerName: "Role", width: 120 },
            { field: "department", headerName: "Department", width: 130 },
            { field: "location", headerName: "Location", width: 110 },
          ],
        },
        {
          headerName: "Timeline",
          groupId: "timeline",
          children: [
            { field: "joinDate", headerName: "Join date", width: 110 },
            { field: "startYear", headerName: "Start", width: 90 },
          ],
        },
        { field: "salary", headerName: "Salary", width: 110, pinned: "right" },
        { field: "status", headerName: "Status", width: 120 },
      ],
      rowData: [
        {
          id: 1,
          name: "Alice",
          role: "Engineer",
          department: "Eng",
          location: "NYC",
          joinDate: "2015-01-15",
          startYear: 2015,
          salary: 100,
          status: "ok",
        },
      ],
    });

    const centerBefore = engine.getColumnModel().getCenterColumns().map((col) => col.colId);
    expect(centerBefore).toEqual([
      "role",
      "department",
      "location",
      "joinDate",
      "startYear",
      "status",
    ]);

    const columns = engine.getColumnModel().getColumns();
    const flattenOrder = flattenColumnDefs(engine.getOptions().columnDefs ?? []).map(
      (entry) => entry.colId,
    );
    const move = computeColumnMove(
      columns.map((column) => ({
        colId: column.colId,
        pinned: column.pinned,
        def: column.def,
        isSelectionColumn: column.isSelectionColumn,
      })),
      "role",
      5,
      {},
      flattenOrder,
    );
    expect(move).not.toBeNull();

    expect(engine.moveColumn("role", 5)).toBe(true);
    expect(engine.getColumnModel().getCenterColumns().map((col) => col.colId)).toEqual([
      "department",
      "location",
      "joinDate",
      "startYear",
      "status",
      "role",
    ]);
  });
});
