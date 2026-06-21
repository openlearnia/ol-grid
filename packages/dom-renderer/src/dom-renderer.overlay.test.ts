/** @vitest-environment happy-dom */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createGridEngine } from "@ol-grid/core";
import { FilterModule } from "@ol-grid/filter";
import { SortModule } from "@ol-grid/sort";
import { createDomRenderer } from "./dom-renderer.js";

interface Person {
  id: number;
  name: string;
  role: string;
  department: string;
  location: string;
  startYear: number;
  joinDate: string;
  salary: number;
  status: string;
}

const employeeColumnDefs = [
  { field: "id", headerName: "ID", width: 72, pinned: "left" as const },
  {
    field: "name",
    headerName: "Name",
    width: 140,
    pinned: "left" as const,
    editable: true,
    filter: "text" as const,
    floatingFilter: true,
  },
  { field: "role", headerName: "Role", width: 120, editable: true, filter: "text" as const },
  { field: "department", headerName: "Department", width: 130, filter: "text" as const, floatingFilter: true },
  { field: "location", headerName: "Location", width: 110 },
  { field: "joinDate", headerName: "Join date", width: 110, filter: "date" as const },
  { field: "startYear", headerName: "Start", width: 90, editable: true },
  {
    field: "salary",
    headerName: "Salary",
    width: 110,
    editable: true,
    pinned: "right" as const,
    filter: "number" as const,
  },
  { field: "status", headerName: "Status", flex: 1, editable: true },
];

function makeRow(id: number): Person {
  return {
    id,
    name: `User ${id}`,
    role: "Engineer",
    department: "Platform",
    location: "Remote",
    startYear: 2020,
    joinDate: "2020-01-15",
    salary: 90000,
    status: "Active",
  };
}

describe("DomRenderer overlays", () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement("div");
    host.style.width = "1200px";
    host.style.height = "500px";
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

  it("hides overlay for client-side row data", () => {
    const engine = createGridEngine<Person>({
      modules: [SortModule, FilterModule],
      getRowId: ({ data }) => String(data.id),
      columnDefs: employeeColumnDefs,
      rowData: Array.from({ length: 100 }, (_, i) => makeRow(i + 1)),
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 1200, height: 500 });

    const overlay = host.querySelector<HTMLElement>(".ol-grid__overlay");
    const frame = engine.getLastFrame();

    expect(frame?.overlayLoading).toBe(false);
    expect(frame?.overlayNoRows).toBe(false);
    expect(overlay?.hidden).toBe(true);
    expect(getComputedStyle(overlay!).display).toBe("none");
  });

  it("shows no-rows overlay only when row data is empty", () => {
    const engine = createGridEngine<Person>({
      modules: [SortModule, FilterModule],
      getRowId: ({ data }) => String(data.id),
      columnDefs: employeeColumnDefs,
      rowData: [],
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 1200, height: 500 });

    const overlay = host.querySelector<HTMLElement>(".ol-grid__overlay");
    expect(engine.getLastFrame()?.overlayNoRows).toBe(true);
    expect(overlay?.hidden).toBe(false);
    expect(getComputedStyle(overlay!).display).toBe("flex");
  });

  it("does not leave overlay visible before viewport is measured with row data", () => {
    const engine = createGridEngine<Person>({
      modules: [SortModule, FilterModule],
      getRowId: ({ data }) => String(data.id),
      columnDefs: employeeColumnDefs,
      rowData: [makeRow(1)],
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);

    const overlay = host.querySelector<HTMLElement>(".ol-grid__overlay");
    const frame = engine.getLastFrame()!;

    expect(frame.overlayNoRows).toBe(false);
    expect(frame.overlayLoading).toBe(false);
    expect(overlay?.hidden).toBe(true);
    expect(getComputedStyle(overlay!).display).toBe("none");
  });

  it("expands flex status column after viewport is measured", () => {
    const engine = createGridEngine<Person>({
      modules: [SortModule, FilterModule],
      getRowId: ({ data }) => String(data.id),
      columnDefs: employeeColumnDefs,
      rowData: [makeRow(1)],
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);

    const beforeViewport = engine.getLastFrame()!;
    const statusBefore = beforeViewport.centerColumns.find((col) => col.colId === "status");
    expect(statusBefore?.width).toBeLessThan(200);

    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 1200, height: 500 });

    const afterViewport = engine.getLastFrame()!;
    const statusAfter = afterViewport.centerColumns.find((col) => col.colId === "status");
    const fixedCenterWidth = afterViewport.centerColumns
      .filter((col) => col.colId !== "status")
      .reduce((sum, col) => sum + col.width, 0);

    expect(afterViewport.centerWidth).toBe(afterViewport.centerViewportWidth);
    expect(statusAfter?.width).toBe(afterViewport.centerViewportWidth - fixedCenterWidth);
    expect(statusAfter!.width).toBeGreaterThan(statusBefore!.width);
  });

  it("fills flex status column between center columns and pinned-right salary", () => {
    const engine = createGridEngine<Person>({
      modules: [SortModule, FilterModule],
      getRowId: ({ data }) => String(data.id),
      columnDefs: employeeColumnDefs,
      rowData: [makeRow(1)],
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);
    engine.getStore().dispatch({ type: "SET_VIEWPORT", width: 1200, height: 500 });

    const frame = engine.getLastFrame()!;
    const status = frame.centerColumns.find((col) => col.colId === "status");

    expect(frame.centerWidth).toBe(frame.centerViewportWidth);
    expect(status?.width).toBeGreaterThan(150);

    const centerScroll = host.querySelector<HTMLElement>(".ol-grid__center-scroll");
    const headerPinnedRight = host.querySelector<HTMLElement>(".ol-grid__header-pinned-right");
    const centerRight = centerScroll!.offsetLeft + centerScroll!.offsetWidth;
    expect(headerPinnedRight!.offsetLeft).toBe(centerRight);
  });
});
