/** @vitest-environment happy-dom */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createGridEngine } from "@ol-grid/core";
import { createDomRenderer } from "./dom-renderer.js";

interface ScrollRow {
  id: number;
  name: string;
}

interface WideRow {
  id: number;
  name: string;
  role: string;
  department: string;
}

describe("DomRenderer scrollbar scroll sync", () => {
  let host: HTMLElement;
  let rafScheduled: FrameRequestCallback | null;

  beforeEach(() => {
    host = document.createElement("div");
    host.style.width = "800px";
    host.style.height = "400px";
    document.body.appendChild(host);

    rafScheduled = null;
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
      rafScheduled = cb;
      return 1;
    };
    globalThis.cancelAnimationFrame = () => {
      rafScheduled = null;
    };
    globalThis.ResizeObserver = class {
      observe() {}
      disconnect() {}
      unobserve() {}
    };
  });

  afterEach(() => {
    host.remove();
  });

  it("syncs store scrollTop and rowOffset synchronously on body scroll", () => {
    const rowData = Array.from({ length: 100 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
    }));

    const engine = createGridEngine<ScrollRow>({
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

    const body = host.querySelector<HTMLElement>(".ol-grid__body");
    const rowsCenter = host.querySelector<HTMLElement>(".ol-grid__rows--center");
    expect(body).not.toBeNull();
    expect(rowsCenter).not.toBeNull();

    body!.scrollTop = 480;
    body!.dispatchEvent(new Event("scroll"));

    expect(rafScheduled).toBeNull();
    expect(engine.getStore().getState().scrollTop).toBe(480);
    expect(rowsCenter!.style.transform).toBe("translate3d(0, 320px, 0)");

    const centerRows = [...rowsCenter!.querySelectorAll<HTMLElement>(".ol-grid__row")];
    expect(centerRows.some((row) => row.dataset.rowIndex === "15")).toBe(true);
    expect(Number(centerRows[0]?.dataset.rowIndex)).toBeLessThanOrEqual(15);
  });

  it("syncs horizontal scroll into store synchronously", () => {
    const rowData = [
      { id: 1, name: "Alice", role: "Engineer", department: "Platform" },
    ];

    const engine = createGridEngine<WideRow>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72 },
        { field: "name", headerName: "Name", width: 400 },
        { field: "role", headerName: "Role", width: 400 },
        { field: "department", headerName: "Department", width: 400 },
      ],
      rowData,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 300, height: 200 });

    const centerScroll = host.querySelector<HTMLElement>(".ol-grid__center-scroll");
    expect(centerScroll).not.toBeNull();

    centerScroll!.scrollLeft = 250;
    centerScroll!.dispatchEvent(new Event("scroll"));

    expect(rafScheduled).toBeNull();
    expect(engine.getStore().getState().scrollLeft).toBe(250);
  });
});
