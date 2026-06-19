/** @vitest-environment happy-dom */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createGridEngine } from "./grid-engine.js";

interface Person {
  id: number;
  name: string;
  role: string;
}

describe("GridEngine Sprint 2", () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
  });

  afterEach(() => {
    host.remove();
  });

  it("getColumnState and applyColumnState round-trip width and pin", () => {
    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72, pinned: "left" },
        { field: "name", headerName: "Name", width: 140 },
        { field: "role", headerName: "Role", width: 120, pinned: "right" },
      ],
      rowData: [{ id: 1, name: "Alice", role: "Engineer" }],
    });

    const applied = engine.getApi().applyColumnState({
      state: [
        { colId: "name", width: 200 },
        { colId: "role", pinned: "right", width: 150 },
      ],
    });

    expect(applied).toBe(true);
    const state = engine.getApi().getColumnState();
    expect(state.find((col) => col.colId === "name")?.width).toBe(200);
    expect(state.find((col) => col.colId === "role")?.width).toBe(150);
    expect(engine.getColumnModel().getPinnedRightColumns().map((col) => col.colId)).toEqual([
      "role",
    ]);
  });

  it("applyColumnState returns false for unknown columns without defaultState", () => {
    const engine = createGridEngine<Person>({
      columnDefs: [{ field: "name", headerName: "Name", width: 140 }],
      rowData: [{ id: 1, name: "Alice", role: "Engineer" }],
    });

    const applied = engine.getApi().applyColumnState({
      state: [{ colId: "missing", width: 100 }],
    });
    expect(applied).toBe(false);
  });

  it("moveFocusedCell within viewport does not change scrollTop", () => {
    const rowData = Array.from({ length: 100 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
      role: "Engineer",
    }));

    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140 },
      ],
      rowData,
    });

    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });
    engine.getStore().dispatch({ type: "SET_SCROLL", scrollTop: 320, scrollLeft: 0 });

    engine.getApi().setFocusedCell(10, "name");
    const scrollAfterFocus = engine.getStore().getState().scrollTop;

    engine.moveFocusedCell(1, 0);
    expect(engine.getApi().getFocusedCell()?.rowIndex).toBe(11);
    expect(engine.getStore().getState().scrollTop).toBe(scrollAfterFocus);

    engine.moveFocusedCell(-1, 0);
    expect(engine.getApi().getFocusedCell()?.rowIndex).toBe(10);
    expect(engine.getStore().getState().scrollTop).toBe(scrollAfterFocus);
  });

  it("moveFocusedCell to off-screen row scrolls minimally into view", () => {
    const rowData = Array.from({ length: 100 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
      role: "Engineer",
    }));

    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140 },
      ],
      rowData,
    });

    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });
    engine.getStore().dispatch({ type: "SET_SCROLL", scrollTop: 320, scrollLeft: 0 });

    engine.getApi().setFocusedCell(15, "name");
    const scrollBefore = engine.getStore().getState().scrollTop;

    engine.moveFocusedCell(1, 0);
    expect(engine.getApi().getFocusedCell()?.rowIndex).toBe(16);
    expect(engine.getStore().getState().scrollTop).toBeGreaterThan(scrollBefore);
    expect(engine.getStore().getState().scrollTop).toBe(16 * 32 - 200 + 32);
  });

  it("ensureIndexVisible updates scrollTop in store", () => {
    const rowData = Array.from({ length: 100 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
      role: "Engineer",
    }));

    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140 },
      ],
      rowData,
    });

    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });

    engine.getApi().setFocusedCell(50, "name");
    expect(engine.getStore().getState().scrollTop).toBeGreaterThan(0);

    engine.getApi().ensureIndexVisible(0, "top");
    expect(engine.getStore().getState().scrollTop).toBe(0);
  });

  it("pageFocusedCell moves by viewport row count", () => {
    const rowData = Array.from({ length: 100 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
      role: "Engineer",
    }));

    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140 },
      ],
      rowData,
    });

    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 160 });

    engine.getApi().setFocusedCell(0, "name");
    engine.pageFocusedCell("down");
    expect(engine.getApi().getFocusedCell()?.rowIndex).toBe(5);

    engine.pageFocusedCell("up");
    expect(engine.getApi().getFocusedCell()?.rowIndex).toBe(0);
  });

  it("moveFocusedCellToColumn jumps to first and last columns across pin regions", () => {
    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72, pinned: "left" },
        { field: "name", headerName: "Name", width: 140 },
        { field: "role", headerName: "Role", width: 120, pinned: "right" },
      ],
      rowData: [{ id: 1, name: "Alice", role: "Engineer" }],
    });

    engine.getApi().setFocusedCell(0, "name");
    engine.moveFocusedCellToColumn("first");
    expect(engine.getApi().getFocusedCell()?.colId).toBe("id");

    engine.moveFocusedCellToColumn("last");
    expect(engine.getApi().getFocusedCell()?.colId).toBe("role");
  });

  it("toggleHeaderCheckbox selects and deselects all rows", () => {
    const rowData = Array.from({ length: 5 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
      role: "Engineer",
    }));

    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      rowSelection: "multiple",
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140 },
      ],
      rowData,
    });

    engine.toggleHeaderCheckbox();
    expect(engine.getApi().getSelectedRows()).toHaveLength(5);

    engine.toggleHeaderCheckbox();
    expect(engine.getApi().getSelectedRows()).toHaveLength(0);
  });
});
