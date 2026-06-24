/** @vitest-environment happy-dom */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createGridEngine } from "@ol-grid/core";
import { createDomRenderer } from "../dom-renderer.js";

interface Person {
  id: number;
  name: string;
  role: string;
  department: string;
  location: string;
  startYear: number;
  salary: number;
  status: string;
}

describe("DomRenderer width layout", () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement("div");
    host.style.width = "1200px";
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

  it("sizes center scroll to column sum and places pinned-right adjacent when underflowing", () => {
    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72, pinned: "left" },
        { field: "name", headerName: "Name", width: 140, pinned: "left" },
        { field: "role", headerName: "Role", width: 120 },
        { field: "department", headerName: "Department", width: 130 },
        { field: "location", headerName: "Location", width: 110 },
        { field: "startYear", headerName: "Start", width: 90 },
        { field: "salary", headerName: "Salary", width: 110, pinned: "right" },
        { field: "status", headerName: "Status", width: 120 },
      ],
      rowData: [{ id: 1, name: "User 1", role: "Engineer", department: "Platform", location: "Remote", startYear: 2020, salary: 90000, status: "Active" }],
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 1200, height: 400 });

    const centerWidth = 120 + 130 + 110 + 90 + 120;
    const renderWidth = 72 + 140 + centerWidth + 110;
    const centerScroll = host.querySelector<HTMLElement>(".ol-grid__center-scroll");
    const headerCenter = host.querySelector<HTMLElement>(".ol-grid__header-center");
    const header = host.querySelector<HTMLElement>(".ol-grid__header");
    const bodyInner = host.querySelector<HTMLElement>(".ol-grid__body-inner");
    const headerPinnedRight = host.querySelector<HTMLElement>(".ol-grid__header-pinned-right");
    const bodyPinnedRight = host.querySelector<HTMLElement>(".ol-grid__body-pinned-right");
    const spacers = host.querySelectorAll<HTMLElement>(".ol-grid__layout-spacer");

    expect(centerScroll?.style.width).toBe(`${centerWidth}px`);
    expect(headerCenter?.style.width).toBe(`${centerWidth}px`);
    expect(host.style.width).toBe(`${renderWidth}px`);
    expect(host.style.maxWidth).toBe("100%");
    expect(header?.style.width).toBe(`${renderWidth}px`);
    expect(bodyInner?.style.width).toBe(`${renderWidth}px`);
    expect(spacers.length).toBe(3);
    expect(
      host.querySelectorAll(".ol-grid__header-main > .ol-grid__layout-spacer").length,
    ).toBe(1);
    expect(
      host.querySelectorAll(".ol-grid__floating-filters > .ol-grid__layout-spacer").length,
    ).toBe(1);
    expect(
      host.querySelectorAll(".ol-grid__body-inner > .ol-grid__layout-spacer").length,
    ).toBe(1);

    const pinnedRightLeft = headerPinnedRight!.offsetLeft;
    const centerRight = headerCenter!.offsetLeft + headerCenter!.offsetWidth;
    expect(pinnedRightLeft).toBe(centerRight);

    expect(bodyPinnedRight?.offsetLeft).toBe(centerScroll!.offsetLeft + centerScroll!.offsetWidth);
  });

  it("uses center viewport width for scroll container when center columns overflow", () => {
    const engine = createGridEngine<Person>({
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "id", headerName: "ID", width: 72, pinned: "left" },
        { field: "name", headerName: "Name", width: 140, pinned: "left" },
        { field: "role", headerName: "Role", width: 120 },
        { field: "department", headerName: "Department", width: 130 },
        { field: "location", headerName: "Location", width: 110 },
        { field: "startYear", headerName: "Start", width: 90 },
        { field: "status", headerName: "Status", width: 120 },
        { field: "salary", headerName: "Salary", width: 110, pinned: "right" },
      ],
      rowData: [{ id: 1, name: "User 1", role: "Engineer", department: "Platform", location: "Remote", startYear: 2020, salary: 90000, status: "Active" }],
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 500, height: 400 });

    const centerViewport = 500 - 72 - 140 - 110;
    const centerScroll = host.querySelector<HTMLElement>(".ol-grid__center-scroll");
    const centerInner = host.querySelector<HTMLElement>(".ol-grid__center-inner");
    const header = host.querySelector<HTMLElement>(".ol-grid__header");
    const bodyInner = host.querySelector<HTMLElement>(".ol-grid__body-inner");

    expect(centerScroll?.style.width).toBe(`${centerViewport}px`);
    expect(centerInner?.style.width).toBe(`${120 + 130 + 110 + 90 + 120}px`);
    expect(host.style.width).toBe("500px");
    expect(host.style.maxWidth).toBe("100%");
    expect(header?.style.width).toBe("500px");
    expect(bodyInner?.style.width).toBe("500px");
  });
});
