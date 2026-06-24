/** @vitest-environment happy-dom */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createGridEngine } from "@ol-grid/core";
import { FilterModule } from "@ol-grid/filter";
import { createDomRenderer } from "../dom-renderer.js";
import {
  bodyCellTestId,
  bodyViewportTestId,
  centerViewportTestId,
  filterButtonTestId,
  filterPopupInputTestId,
  filterPopupTestId,
  floatingFilterTestId,
  gridTestId,
  headerCellTestId,
  headerCheckboxTestId,
  rowCheckboxTestId,
  sortIndicatorTestId,
} from "../test-ids.js";

interface Person {
  id: number;
  name: string;
  role: string;
}

function setupHost(width = 800, height = 400): HTMLElement {
  const host = document.createElement("div");
  host.style.width = `${width}px`;
  host.style.height = `${height}px`;
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

  return host;
}

describe("DomRenderer data-testid hooks", () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = setupHost();
  });

  afterEach(() => {
    host.remove();
  });

  it("exposes stable test ids on grid shell, viewport, headers, cells, and selection", () => {
    const engine = createGridEngine<Person>({
      modules: [FilterModule],
      getRowId: ({ data }) => String(data.id),
      rowSelection: "multiple",
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        {
          field: "name",
          headerName: "Name",
          width: 140,
          filter: "text",
          floatingFilter: true,
        },
        { field: "role", headerName: "Role", width: 120, filter: "text" },
      ],
      rowData: [
        { id: 1, name: "Alice", role: "Engineer" },
        { id: 2, name: "Bob", role: "Designer" },
      ],
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 400 });

    expect(host.dataset.testid).toBe(gridTestId);
    expect(host.getAttribute("data-testid")).toBe(gridTestId);
    expect(host.querySelector(`[data-testid="${bodyViewportTestId}"]`)).not.toBeNull();
    expect(host.querySelector(`[data-testid="${centerViewportTestId}"]`)).not.toBeNull();

    expect(host.querySelector(`[data-testid="${headerCellTestId("id")}"]`)).not.toBeNull();
    expect(host.querySelector(`[data-testid="${headerCellTestId("name")}"]`)).not.toBeNull();
    expect(host.querySelector(`[data-testid="${headerCellTestId("__selection__")}"]`)).not.toBeNull();
    expect(host.querySelector(`[data-testid="${headerCheckboxTestId}"]`)).not.toBeNull();

    expect(host.querySelector(`[data-testid="${bodyCellTestId(0, "name")}"]`)).not.toBeNull();
    expect(host.querySelector(`[data-testid="${bodyCellTestId(1, "role")}"]`)).not.toBeNull();
    expect(host.querySelector(`[data-testid="${rowCheckboxTestId(0)}"]`)).not.toBeNull();
    expect(host.querySelector(`[data-testid="${rowCheckboxTestId(1)}"]`)).not.toBeNull();

    expect(host.querySelector(`[data-testid="${floatingFilterTestId("name")}"]`)).not.toBeNull();
    expect(host.querySelector(`[data-testid="${filterButtonTestId("name")}"]`)).not.toBeNull();
    expect(host.querySelector(`[data-testid="${filterButtonTestId("role")}"]`)).not.toBeNull();
    expect(host.querySelector(`[data-testid="${sortIndicatorTestId("name")}"]`)).not.toBeNull();
  });

  it("exposes filter popup test ids when column filter is opened", () => {
    const engine = createGridEngine<Person>({
      modules: [FilterModule],
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 140, filter: "text" },
      ],
      rowData: [{ id: 1, name: "Alice", role: "Engineer" }],
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 800, height: 400 });

    engine.openColumnFilter("name");

    expect(host.querySelector(`[data-testid="${filterPopupTestId("name")}"]`)).not.toBeNull();
    expect(host.querySelector(`[data-testid="${filterPopupInputTestId("name")}"]`)).not.toBeNull();
  });
});
