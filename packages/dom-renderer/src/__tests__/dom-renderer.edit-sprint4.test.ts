/** @vitest-environment happy-dom */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createGridEngine } from "@ol-grid/core";
import { createDomRenderer } from "../dom-renderer.js";

interface Person {
  id: number;
  name: string;
  role: string;
  salary: number;
  status: string;
}

const statuses = ["Active", "On leave", "Contract"];

describe("DomRenderer cell editing — Sprint 4", () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement("div");
    host.style.width = "800px";
    host.style.height = "400px";
    document.body.appendChild(host);

    globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    };
    globalThis.cancelAnimationFrame = () => {};
    globalThis.ResizeObserver = class {
      observe() {}
      disconnect() {}
      unobserve() {}
    };
  });

  afterEach(() => {
    host.remove();
  });

  it("rejects commit when valueSetter returns false and keeps editor open", () => {
    const rowData: Person[] = [{ id: 1, name: "Ann", role: "Eng", salary: 100, status: "Active" }];

    const engine = createGridEngine<Person>({
      columnDefs: [
        {
          field: "salary",
          editable: true,
          valueSetter: ({ newValue }) => typeof newValue === "number" && newValue >= 100,
        },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.startEditingCell(0, "salary");
    engine.updateEditValue("50");

    const committed = engine.stopEditing(false);
    expect(committed).toBe(false);
    expect(engine.getStore().getState().editing).not.toBeNull();
    expect(rowData[0]!.salary).toBe(100);

    engine.destroy();
  });

  it("Tab commits and moves to the next editable cell", () => {
    const rowData: Person[] = [{ id: 1, name: "Ann", role: "Eng", salary: 100, status: "Active" }];

    const engine = createGridEngine<Person>({
      columnDefs: [
        { field: "name", editable: true },
        { field: "role", editable: true },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.startEditingCell(0, "name");
    engine.updateEditValue("Bob");
    engine.stopEditingAndMoveToNextEditable(true);

    expect(rowData[0]!.name).toBe("Bob");
    expect(engine.getStore().getState().editing).toMatchObject({
      activeCell: { rowIndex: 0, colId: "role" },
    });

    engine.destroy();
  });

  it("renders a select editor for cellEditor select columns", () => {
    const rowData: Person[] = [{ id: 1, name: "Ann", role: "Eng", salary: 100, status: "Active" }];

    const engine = createGridEngine<Person>({
      columnDefs: [
        {
          field: "status",
          editable: true,
          cellEditor: "select",
          cellEditorParams: { values: statuses },
        },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.startEditingCell(0, "status");

    const select = host.querySelector("select.ol-grid__cell-editor");
    expect(select).not.toBeNull();
    expect(select!.querySelectorAll("option")).toHaveLength(3);

    engine.destroy();
  });

  it("renders a number editor with min/max attributes", () => {
    const rowData: Person[] = [{ id: 1, name: "Ann", role: "Eng", salary: 100, status: "Active" }];

    const engine = createGridEngine<Person>({
      columnDefs: [
        {
          field: "salary",
          editable: true,
          cellEditor: "number",
          cellEditorParams: { min: 0, max: 500000, step: 1000 },
        },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.startEditingCell(0, "salary");

    const input = host.querySelector<HTMLInputElement>("input.ol-grid__cell-editor");
    expect(input?.type).toBe("number");
    expect(input?.min).toBe("0");
    expect(input?.max).toBe("500000");
    expect(input?.step).toBe("1000");

    engine.destroy();
  });

  it("cancels edit on outside click when stopEditingWhenCellsLoseFocus is false", () => {
    const rowData: Person[] = [{ id: 1, name: "Ann", role: "Eng", salary: 100, status: "Active" }];

    const engine = createGridEngine<Person>({
      stopEditingWhenCellsLoseFocus: false,
      columnDefs: [{ field: "name", editable: true }],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.startEditingCell(0, "name");
    engine.updateEditValue("Changed");

    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    expect(engine.getStore().getState().editing).toBeNull();
    expect(rowData[0]!.name).toBe("Ann");

    engine.destroy();
  });
});
