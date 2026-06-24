/** @vitest-environment happy-dom */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createGridEngine } from "../grid-engine.js";

interface Row {
  id: number;
  name: string;
  role: string;
  salary: number;
}

describe("GridEngine Sprint 8 column sizing API", () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement("div");
    host.style.width = "600px";
    host.style.height = "400px";
    document.body.appendChild(host);
    globalThis.ResizeObserver = class {
      observe() {}
      disconnect() {}
      unobserve() {}
    };
  });

  afterEach(() => {
    host.remove();
  });

  it("sizeColumnsToFit adjusts center column widths", () => {
    const engine = createGridEngine<Row>({
      columnDefs: [
        { field: "name", headerName: "Name", width: 200 },
        { field: "role", headerName: "Role", width: 200 },
      ],
      rowData: [{ id: 1, name: "Ann", role: "Eng", salary: 100 }],
    });

    engine.getStore().dispatch({ type: "SET_VIEWPORT", viewportWidth: 600, viewportHeight: 400 });
    engine.getApi().sizeColumnsToFit(600);

    const state = engine.getApi().getColumnState();
    const total = state.reduce((sum, col) => sum + (col.width ?? 0), 0);
    expect(total).toBe(600);
    engine.destroy();
  });

  it("autoSizeAllColumns sets widths from cell content", () => {
    const engine = createGridEngine<Row>({
      columnDefs: [
        { field: "name", headerName: "Name", width: 50 },
        { field: "role", headerName: "Role", width: 50 },
      ],
      rowData: [
        { id: 1, name: "Very Long Employee Name", role: "Principal Engineer", salary: 100 },
      ],
    });

    engine.getApi().autoSizeAllColumns();
    const nameWidth = engine.getApi().getColumnState().find((col) => col.colId === "name")?.width;
    expect(nameWidth).toBeGreaterThan(50);
    engine.destroy();
  });
});
