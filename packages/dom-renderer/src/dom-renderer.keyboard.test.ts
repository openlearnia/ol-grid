/** @vitest-environment happy-dom */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createGridEngine } from "@ol-grid/core";
import { createDomRenderer } from "./dom-renderer.js";

interface Person {
  id: number;
  name: string;
  role: string;
}

describe("DomRenderer keyboard navigation", () => {
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

  it("ArrowDown within viewport does not change scrollTop", () => {
    const rowData = Array.from({ length: 50 }, (_, index) => ({
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

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });
    engine.getStore().dispatch({ type: "SET_SCROLL", scrollTop: 320, scrollLeft: 0 });
    engine.getApi().setFocusedCell(10, "name");

    const scrollBefore = engine.getStore().getState().scrollTop;
    host.focus();
    host.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }),
    );

    expect(engine.getApi().getFocusedCell()?.rowIndex).toBe(11);
    expect(engine.getStore().getState().scrollTop).toBe(scrollBefore);
  });

  it("ArrowDown to off-screen row scrolls into view", () => {
    const rowData = Array.from({ length: 50 }, (_, index) => ({
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

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });
    engine.getStore().dispatch({ type: "SET_SCROLL", scrollTop: 320, scrollLeft: 0 });
    engine.getApi().setFocusedCell(15, "name");

    const scrollBefore = engine.getStore().getState().scrollTop;
    host.focus();
    host.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }),
    );

    expect(engine.getApi().getFocusedCell()?.rowIndex).toBe(16);
    expect(engine.getStore().getState().scrollTop).toBeGreaterThan(scrollBefore);
    expect(engine.getStore().getState().scrollTop).toBe(16 * 32 - 200 + 32);
  });

  it("handles Home, End, PageUp, and PageDown", () => {
    const rowData = Array.from({ length: 50 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
      role: "Engineer",
    }));

    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72, pinned: "left" },
        { field: "name", headerName: "Name", width: 140 },
        { field: "role", headerName: "Role", width: 120, pinned: "right" },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 160 });
    engine.getApi().setFocusedCell(10, "name");

    host.focus();
    host.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    expect(engine.getApi().getFocusedCell()?.colId).toBe("id");

    host.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    expect(engine.getApi().getFocusedCell()?.colId).toBe("role");

    host.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown", bubbles: true }));
    expect(engine.getApi().getFocusedCell()?.rowIndex).toBe(15);

    host.dispatchEvent(new KeyboardEvent("keydown", { key: "PageUp", bubbles: true }));
    expect(engine.getApi().getFocusedCell()?.rowIndex).toBe(10);
  });

  it("renders header select-all checkbox in multi selection mode", () => {
    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      rowSelection: "multiple",
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140 },
      ],
      rowData: [
        { id: 1, name: "Alice", role: "Engineer" },
        { id: 2, name: "Bob", role: "Designer" },
      ],
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);

    const headerCheckbox = host.querySelector<HTMLInputElement>("[data-header-select-all]");
    expect(headerCheckbox).not.toBeNull();
    expect(headerCheckbox?.type).toBe("checkbox");

    headerCheckbox?.click();
    expect(engine.getApi().getSelectedRows()).toHaveLength(2);
    expect(headerCheckbox?.checked).toBe(true);
  });

  it("Enter on focused cell starts editing", () => {
    const rowData = [{ id: 1, name: "Alice", role: "Engineer" }];

    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "name", headerName: "Name", width: 140, editable: true },
        { field: "role", headerName: "Role", width: 120 },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 400 });
    engine.getApi().setFocusedCell(0, "name");

    host.focus();
    host.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
    );

    expect(engine.getStore().getState().editing).not.toBeNull();
    expect(host.querySelector(".ol-grid__cell-editor")).not.toBeNull();
  });

  it("Enter after clicking a cell starts editing", () => {
    const rowData = [{ id: 1, name: "Alice", role: "Engineer" }];

    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "name", headerName: "Name", width: 140, editable: true },
        { field: "role", headerName: "Role", width: 120 },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 400 });

    const nameCell = host.querySelector<HTMLElement>(".ol-grid__cell[data-col-id='name']");
    expect(nameCell).not.toBeNull();
    nameCell!.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(engine.getApi().getFocusedCell()?.colId).toBe("name");
    expect(document.activeElement).toBe(nameCell);

    nameCell!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
    );

    expect(engine.getStore().getState().editing).not.toBeNull();
    expect(nameCell!.querySelector(".ol-grid__cell-editor")).not.toBeNull();
  });

  it("Enter while editing commits the value", () => {
    const rowData = [{ id: 1, name: "Alice", role: "Engineer" }];

    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "name", headerName: "Name", width: 140, editable: true },
        { field: "role", headerName: "Role", width: 120 },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 400 });
    engine.startEditingCell(0, "name");

    const input = host.querySelector<HTMLInputElement>(".ol-grid__cell-editor");
    expect(input).not.toBeNull();
    input!.value = "Alicia";
    engine.updateEditValue("Alicia");

    input!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
    );

    expect(engine.getStore().getState().editing).toBeNull();
    expect(rowData[0]!.name).toBe("Alicia");
  });

  it("renders pinned-right header and body regions", () => {
    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72, pinned: "left" },
        { field: "name", headerName: "Name", width: 140 },
        { field: "role", headerName: "Role", width: 120, pinned: "right" },
      ],
      rowData: [{ id: 1, name: "Alice", role: "Engineer" }],
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);

    expect(host.querySelector(".ol-grid__header-pinned-right [data-col-id='role']")).not.toBeNull();
    expect(host.querySelector(".ol-grid__body-pinned-right [data-col-id='role']")).not.toBeNull();
  });
});
