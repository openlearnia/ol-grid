/** @vitest-environment happy-dom */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createGridEngine } from "@ol-grid/core";
import { createDomRenderer } from "../dom-renderer.js";

interface Person {
  id: number;
  name: string;
  role: string;
}

describe("DomRenderer cell editing", () => {
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

  it("replaces only the edited cell with an input, not a nested row", () => {
    const rowData: Person[] = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      role: "Engineer",
    }));

    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      rowSelection: "multiple",
      columnDefs: [
        { field: "id", headerName: "ID", width: 72, pinned: "left" },
        { field: "name", headerName: "Name", width: 140, pinned: "left", editable: true },
        { field: "role", headerName: "Role", width: 120, editable: true },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);

    const started = engine.startEditingCell(1, "name");
    expect(started).toBe(true);

    const pinnedRow = host.querySelector(".ol-grid__rows--pinned .ol-grid__row[data-row-index='1']");
    expect(pinnedRow).not.toBeNull();

    const nameCell = pinnedRow!.querySelector(":scope > .ol-grid__cell[data-col-id='name']");
    expect(nameCell).not.toBeNull();

    const directChildren = [...nameCell!.children];
    expect(directChildren).toHaveLength(1);
    expect(directChildren[0]!.classList.contains("ol-grid__cell-editor")).toBe(true);

    expect(nameCell!.querySelector("[data-selection-checkbox]")).toBeNull();
    expect(nameCell!.querySelector(".ol-grid__row")).toBeNull();

    const pinnedCells = pinnedRow!.querySelectorAll(":scope > .ol-grid__cell");
    expect(pinnedCells.length).toBe(3);

    const centerRow = host.querySelector(".ol-grid__rows--center .ol-grid__row[data-row-index='1']");
    expect(centerRow!.querySelector(":scope > .ol-grid__cell[data-col-id='role']")?.textContent).toBe(
      "Engineer",
    );

    engine.destroy();
  });

  it("keeps a single input after edit value updates refresh the grid", () => {
    const rowData: Person[] = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      role: "Engineer",
    }));

    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      rowSelection: "multiple",
      columnDefs: [
        { field: "id", headerName: "ID", width: 72, pinned: "left" },
        { field: "name", headerName: "Name", width: 140, pinned: "left", editable: true },
        { field: "role", headerName: "Role", width: 120, editable: true },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);

    engine.getStore().dispatch({ type: "SET_SCROLL", scrollTop: 32 * 50, scrollLeft: 0 });
    engine.startEditingCell(51, "name");

    for (const value of ["User 51", "User 51x", "User 51xy"]) {
      engine.updateEditValue(value);
    }

    const pinnedRow = host.querySelector(
      ".ol-grid__rows--pinned .ol-grid__row[data-row-index='51']",
    );
    const nameCell = pinnedRow!.querySelector(":scope > .ol-grid__cell[data-col-id='name']");

    expect(nameCell!.querySelectorAll(":scope > *")).toHaveLength(1);
    expect(nameCell!.querySelector(".ol-grid__cell-editor")).not.toBeNull();
    expect(nameCell!.querySelector(".ol-grid__row")).toBeNull();
    expect(nameCell!.querySelector("[data-selection-checkbox]")).toBeNull();

    engine.destroy();
  });

  it("keeps the editor mounted while edit value updates trigger store refresh", () => {
    const rowData: Person[] = [{ id: 1, name: "User 1", role: "Engineer" }];

    const engine = createGridEngine<Person>({
      columnDefs: [
        { field: "name", headerName: "Name", width: 140, editable: true },
        { field: "role", headerName: "Role", width: 120 },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.startEditingCell(0, "name");

    const nameCell = host.querySelector(".ol-grid__cell[data-col-id='name']");
    const input = nameCell?.querySelector<HTMLInputElement>(".ol-grid__cell-editor");
    expect(input).not.toBeNull();
    input!.focus();

    engine.updateEditValue("User 1 edited");
    engine.updateEditValue("User 1 edited again");

    expect(nameCell?.querySelectorAll(":scope > .ol-grid__cell-editor")).toHaveLength(1);
    expect(document.activeElement).toBe(input);
    expect(input!.value).toBe("User 1 edited again");

    engine.destroy();
  });
});
