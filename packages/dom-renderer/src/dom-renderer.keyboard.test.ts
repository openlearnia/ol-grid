/** @vitest-environment happy-dom */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
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

  async function flushMicrotasks(): Promise<void> {
    await Promise.resolve();
  }

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

  it("attaches keydown listener to document, not grid host", () => {
    const docSpy = vi.spyOn(document, "addEventListener");
    const hostAddSpy = vi.spyOn(host, "addEventListener");

    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [{ field: "name", headerName: "Name", width: 140 }],
      rowData: [{ id: 1, name: "Alice", role: "Engineer" }],
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);

    const docKeydown = docSpy.mock.calls.filter(([type]) => type === "keydown");
    const hostKeydown = hostAddSpy.mock.calls.filter(([type]) => type === "keydown");

    expect(docKeydown).toHaveLength(1);
    expect(docKeydown[0]![2]).toBe(true);
    expect(hostKeydown).toHaveLength(0);

    docSpy.mockRestore();
    hostAddSpy.mockRestore();
  });

  it("skips keydown when focus is outside the grid", () => {
    const outside = document.createElement("button");
    document.body.appendChild(outside);

    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140 },
      ],
      rowData: [{ id: 1, name: "Alice", role: "Engineer" }],
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });
    engine.getApi().setFocusedCell(0, "name");

    outside.focus();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }),
    );

    expect(engine.getApi().getFocusedCell()?.rowIndex).toBe(0);
    outside.remove();
  });

  it("clears focused cell on mousedown outside the grid", () => {
    const outside = document.createElement("button");
    document.body.appendChild(outside);

    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140 },
      ],
      rowData: [{ id: 1, name: "Alice", role: "Engineer" }],
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });
    engine.getApi().setFocusedCell(0, "name");

    expect(host.querySelector(".ol-grid__cell--focused")).not.toBeNull();
    expect(engine.getApi().getFocusedCell()).toEqual({ rowIndex: 0, colId: "name" });

    outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    expect(engine.getApi().getFocusedCell()).toBeNull();
    expect(host.querySelector(".ol-grid__cell--focused")).toBeNull();

    outside.remove();
  });

  it("keeps focused cell on mousedown inside the grid header", () => {
    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140 },
      ],
      rowData: [{ id: 1, name: "Alice", role: "Engineer" }],
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });
    engine.getApi().setFocusedCell(0, "name");

    const header = host.querySelector<HTMLElement>(".ol-grid__header");
    expect(header).not.toBeNull();
    header!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    expect(engine.getApi().getFocusedCell()).toEqual({ rowIndex: 0, colId: "name" });
    expect(host.querySelector(".ol-grid__cell--focused")).not.toBeNull();
  });

  it("ArrowDown from cell DOM focus moves to the next row", async () => {
    const rowData = Array.from({ length: 50 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
      role: "Engineer",
    }));

    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140, editable: true },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });
    engine.getApi().setFocusedCell(10, "name");

    const cell = host.querySelector<HTMLElement>(".ol-grid__cell--focused");
    expect(cell).not.toBeNull();
    cell!.focus();

    cell!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }),
    );
    await flushMicrotasks();

    const focusedCell = host.querySelector<HTMLElement>(".ol-grid__cell--focused");
    expect(focusedCell?.dataset.colId).toBe("name");
    expect(focusedCell?.closest("[data-row-index]")?.getAttribute("data-row-index")).toBe("11");
    expect(document.activeElement).toBe(focusedCell);
    expect(engine.getApi().getFocusedCell()?.rowIndex).toBe(11);
  });

  it("ArrowDown moves focus ring and DOM focus to the next row", async () => {
    const rowData = Array.from({ length: 50 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
      role: "Engineer",
    }));

    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140, editable: true },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });
    engine.getStore().dispatch({ type: "SET_SCROLL", scrollTop: 320, scrollLeft: 0 });
    engine.getApi().setFocusedCell(10, "name");

    host.focus();
    host.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }),
    );
    await flushMicrotasks();

    const focusedCell = host.querySelector<HTMLElement>(".ol-grid__cell--focused");
    expect(focusedCell?.dataset.colId).toBe("name");
    expect(focusedCell?.closest("[data-row-index]")?.getAttribute("data-row-index")).toBe("11");
    expect(document.activeElement).toBe(focusedCell);
    expect(engine.getApi().getFocusedCell()?.rowIndex).toBe(11);
  });

  it("ArrowDown does not scroll when body scroll is ahead of store scroll", () => {
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
    engine.getStore().dispatch({ type: "SET_SCROLL", scrollTop: 0, scrollLeft: 0 });
    engine.getApi().setFocusedCell(10, "name");

    const body = host.querySelector<HTMLElement>(".ol-grid__body");
    expect(body).not.toBeNull();
    body!.scrollTop = 320;

    host.focus();
    host.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }),
    );

    expect(engine.getApi().getFocusedCell()?.rowIndex).toBe(11);
    expect(body!.scrollTop).toBe(320);
    expect(engine.getStore().getState().scrollTop).toBe(320);
  });

  it("Enter after arrow-only navigation starts editing without a prior click", () => {
    const rowData = [{ id: 1, name: "Alice", role: "Engineer" }];

    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140, editable: true },
        { field: "role", headerName: "Role", width: 120 },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 400 });

    host.focus();
    host.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    host.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
    );

    expect(engine.getStore().getState().editing).toMatchObject({
      activeCell: { rowIndex: 0, colId: "name" },
    });
    expect(host.querySelector(".ol-grid__cell-editor")).not.toBeNull();
  });

  it("F2 on keyboard-focused cell starts editing", () => {
    const rowData = [{ id: 1, name: "Alice", role: "Engineer" }];

    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "name", headerName: "Name", width: 140, editable: true },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 400 });

    host.focus();
    host.dispatchEvent(
      new KeyboardEvent("keydown", { key: "F2", bubbles: true, cancelable: true }),
    );

    expect(engine.getStore().getState().editing).not.toBeNull();
  });

  it("Tab while editing moves to the next editable cell", () => {
    const rowData = [{ id: 1, name: "Alice", role: "Engineer" }];

    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "name", headerName: "Name", width: 140, editable: true },
        { field: "role", headerName: "Role", width: 120, editable: true },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 400 });
    engine.startEditingCell(0, "name");
    engine.updateEditValue("Alicia");

    const input = host.querySelector<HTMLInputElement>(".ol-grid__cell-editor");
    expect(input).not.toBeNull();
    input!.focus();

    input!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }),
    );

    expect(rowData[0]!.name).toBe("Alicia");
    expect(engine.getStore().getState().editing).toMatchObject({
      activeCell: { rowIndex: 0, colId: "role" },
    });
    expect(host.querySelector<HTMLInputElement>(".ol-grid__cell-editor")).not.toBeNull();
  });

  it("Shift+Tab while editing moves to the previous editable cell", () => {
    const rowData = [{ id: 1, name: "Alice", role: "Engineer" }];

    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "name", headerName: "Name", width: 140, editable: true },
        { field: "role", headerName: "Role", width: 120, editable: true },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 400 });
    engine.startEditingCell(0, "role");
    engine.updateEditValue("Designer");

    const input = host.querySelector<HTMLInputElement>(".ol-grid__cell-editor");
    expect(input).not.toBeNull();
    input!.focus();

    input!.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(rowData[0]!.role).toBe("Designer");
    expect(engine.getStore().getState().editing).toMatchObject({
      activeCell: { rowIndex: 0, colId: "name" },
    });
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

  it("mounts focus sentinels before and after the grid root", () => {
    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [{ field: "name", headerName: "Name", width: 140 }],
      rowData: [{ id: 1, name: "Alice", role: "Engineer" }],
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);

    const before = host.querySelector<HTMLElement>("[data-focus-sentinel='before']");
    const after = host.querySelector<HTMLElement>("[data-focus-sentinel='after']");
    const root = host.querySelector(".ol-grid__root");

    expect(before).not.toBeNull();
    expect(after).not.toBeNull();
    expect(before?.getAttribute("aria-hidden")).toBe("true");
    expect(after?.getAttribute("aria-hidden")).toBe("true");
    expect(before?.tabIndex).toBe(-1);
    expect(after?.tabIndex).toBe(-1);
    expect(host.firstElementChild).toBe(before);
    expect(host.lastElementChild).toBe(after);
    expect(before?.nextElementSibling).toBe(root);
    expect(root?.nextElementSibling).toBe(after);
  });

  it("redirects focus from before sentinel to the first navigable header", async () => {
    const rowData = Array.from({ length: 5 }, (_, index) => ({
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

    const before = host.querySelector<HTMLElement>("[data-focus-sentinel='before']");
    expect(before).not.toBeNull();
    before!.focus();

    await flushMicrotasks();

    const focusedHeader = host.querySelector<HTMLElement>(".ol-grid__header-cell--focused");
    expect(focusedHeader).not.toBeNull();
    expect(focusedHeader?.dataset.colId).toBe("id");
    expect(document.activeElement).toBe(focusedHeader);
  });

  it("redirects focus from after sentinel to the last navigable cell", () => {
    const rowData = Array.from({ length: 5 }, (_, index) => ({
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

    const after = host.querySelector<HTMLElement>("[data-focus-sentinel='after']");
    expect(after).not.toBeNull();
    after!.focus();

    expect(engine.getApi().getFocusedCell()).toEqual({ rowIndex: 4, colId: "name" });
    const focusedCell = host.querySelector<HTMLElement>(".ol-grid__cell--focused");
    expect(document.activeElement).toBe(focusedCell);
    expect(focusedCell?.dataset.colId).toBe("name");
  });

  it("prevents default and stops propagation for handled navigation keys", () => {
    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140 },
      ],
      rowData: [{ id: 1, name: "Alice", role: "Engineer" }],
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });
    engine.getApi().setFocusedCell(0, "id");

    host.focus();

    const handledKeys = [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
      "PageUp",
      "PageDown",
      "Enter",
      "F2",
    ] as const;

    for (const key of handledKeys) {
      let propagationStopped = false;
      host.addEventListener(
        "keydown",
        (event) => {
          if (event.key === key) propagationStopped = true;
        },
        false,
      );

      const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
      });
      host.dispatchEvent(event);

      expect(event.defaultPrevented, `${key} should preventDefault`).toBe(true);
      expect(propagationStopped, `${key} should stopPropagation`).toBe(false);
    }
  });

  it("Tab from grid host keeps focus inside the grid (lands on a cell)", async () => {
    const rowData = Array.from({ length: 5 }, (_, index) => ({
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

    host.focus();
    // host.focus() auto-seeds focusedCell to first cell via handleHostFocus
    host.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }),
    );
    await flushMicrotasks();

    // Tab moves from first cell to second cell; focus stays inside the grid
    const focusedCell = host.querySelector<HTMLElement>(".ol-grid__cell--focused");
    expect(focusedCell).not.toBeNull();
    expect(host.contains(document.activeElement)).toBe(true);
  });

  it("Tab moves focus to the next cell and stays inside the grid", async () => {
    const rowData = Array.from({ length: 3 }, (_, index) => ({
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
    engine.getApi().setFocusedCell(0, "id");

    host.focus();
    host.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }),
    );
    await flushMicrotasks();

    expect(engine.getApi().getFocusedCell()).toEqual({ rowIndex: 0, colId: "name" });

    host.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }),
    );
    await flushMicrotasks();

    // last column of row 0 -> first column of row 1
    expect(engine.getApi().getFocusedCell()).toEqual({ rowIndex: 1, colId: "id" });
  });

  it("Tab from last cell exits the grid", async () => {
    const afterBtn = document.createElement("button");
    afterBtn.id = "after-grid";
    afterBtn.textContent = "After";
    document.body.appendChild(afterBtn);

    const rowData = Array.from({ length: 2 }, (_, index) => ({
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
    engine.getApi().setFocusedCell(1, "name");

    const lastCell = host.querySelector<HTMLElement>(
      '.ol-grid__row[data-row-index="1"] .ol-grid__cell[data-col-id="name"]',
    )!;
    lastCell.focus();

    host.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }),
    );
    await flushMicrotasks();

    // last cell -> Tab exits grid
    expect(engine.getApi().getFocusedCell()).toBeNull();
    expect(host.contains(document.activeElement!)).toBe(false);
    expect(document.activeElement).toBe(afterBtn);
    expect(document.activeElement).not.toBe(host);

    afterBtn.remove();
  });

  it("Shift+Tab from first cell moves focus to the last header", async () => {
    const rowData = Array.from({ length: 2 }, (_, index) => ({
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
    engine.getApi().setFocusedCell(0, "id");

    host.focus();
    host.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true }),
    );
    await flushMicrotasks();

    // first cell -> Shift+Tab moves to last header ("name")
    expect(engine.getApi().getFocusedCell()).toBeNull();
    const focusedHeader = host.querySelector<HTMLElement>(".ol-grid__header-cell--focused");
    expect(focusedHeader).not.toBeNull();
    expect(focusedHeader?.dataset.colId).toBe("name");
  });

  it("Tab after clicking a header moves to the next header", async () => {
    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140 },
      ],
      rowData: [{ id: 1, name: "Alice", role: "Engineer" }],
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });

    const idHeader = host.querySelector<HTMLElement>(
      '[data-col-id="id"][role="columnheader"]',
    );
    expect(idHeader).not.toBeNull();
    idHeader!.click();
    await flushMicrotasks();

    expect(engine.getFocusedHeader()).toBe("id");
    expect((document.activeElement as HTMLElement | null)?.dataset.colId).toBe("id");

    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }),
    );
    await flushMicrotasks();

    expect(engine.getFocusedHeader()).toBe("name");
    const focusedHeader = host.querySelector<HTMLElement>(".ol-grid__header-cell--focused");
    expect(focusedHeader?.dataset.colId).toBe("name");
    expect(document.activeElement).toBe(focusedHeader);
  });

  it("Shift+Tab after clicking a header moves to the previous header", async () => {
    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140 },
      ],
      rowData: [{ id: 1, name: "Alice", role: "Engineer" }],
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });

    const nameHeader = host.querySelector<HTMLElement>(
      '[data-col-id="name"][role="columnheader"]',
    );
    expect(nameHeader).not.toBeNull();
    nameHeader!.click();
    await flushMicrotasks();

    expect(engine.getFocusedHeader()).toBe("name");
    expect((document.activeElement as HTMLElement | null)?.dataset.colId).toBe("name");

    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    await flushMicrotasks();

    expect(engine.getFocusedHeader()).toBe("id");
    const focusedHeader = host.querySelector<HTMLElement>(".ol-grid__header-cell--focused");
    expect(focusedHeader?.dataset.colId).toBe("id");
    expect(document.activeElement).toBe(focusedHeader);
  });

  it("Tab from last header after click moves to first body cell", async () => {
    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140 },
      ],
      rowData: [{ id: 1, name: "Alice", role: "Engineer" }],
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });

    const nameHeader = host.querySelector<HTMLElement>(
      '[data-col-id="name"][role="columnheader"]',
    );
    expect(nameHeader).not.toBeNull();
    nameHeader!.click();
    await flushMicrotasks();

    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }),
    );
    await flushMicrotasks();

    expect(engine.getFocusedHeader()).toBeNull();
    expect(engine.getApi().getFocusedCell()).toEqual({ rowIndex: 0, colId: "id" });
    const focusedCell = host.querySelector<HTMLElement>(".ol-grid__cell--focused");
    expect(focusedCell?.dataset.colId).toBe("id");
    expect(document.activeElement).toBe(focusedCell);
  });

  it("Shift+Tab from first header exits the grid", async () => {
    const beforeBtn = document.createElement("button");
    beforeBtn.id = "before-grid";
    beforeBtn.textContent = "Before";
    document.body.insertBefore(beforeBtn, host);

    const rowData = Array.from({ length: 2 }, (_, index) => ({
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
    engine.setFocusedHeader("id");

    const firstHeader = host.querySelector<HTMLElement>(
      '[data-col-id="id"][role="columnheader"]',
    )!;
    firstHeader.focus();
    expect(document.activeElement).toBe(firstHeader);

    host.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true }),
    );
    await flushMicrotasks();

    // first header ("id") -> Shift+Tab exits grid
    expect(engine.getApi().getFocusedCell()).toBeNull();
    expect(engine.getFocusedHeader()).toBeNull();
    expect(host.contains(document.activeElement!)).toBe(false);
    expect(document.activeElement).toBe(beforeBtn);
    expect(document.activeElement).not.toBe(host);

    beforeBtn.remove();
  });

  it("Tab preventDefault and stopPropagation so focus does not escape the grid", async () => {
    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140 },
      ],
      rowData: [{ id: 1, name: "Alice", role: "Engineer" }],
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 200 });
    engine.getApi().setFocusedCell(0, "id");

    host.focus();

    let propagationReachedHost = false;
    host.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Tab") propagationReachedHost = true;
      },
      false,
    );

    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    host.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(propagationReachedHost).toBe(false);
  });
});
