/** @vitest-environment happy-dom */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createGridEngine } from "@ol-grid/core";
import { FilterModule } from "@ol-grid/filter";
import { SortModule } from "@ol-grid/sort";
import { createDomRenderer } from "../dom-renderer.js";

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

describe("DomRenderer react demo layout", () => {
  let shell: HTMLElement;
  let host: HTMLElement;

  beforeEach(() => {
    shell = document.createElement("div");
    shell.className = "demo-grid";
    shell.style.display = "flex";
    shell.style.flexDirection = "column";
    shell.style.width = "1200px";
    shell.style.height = "600px";

    host = document.createElement("div");
    host.className = "ol-grid-host";
    host.style.flex = "1";
    host.style.minHeight = "0";
    shell.appendChild(host);
    document.body.appendChild(shell);

    globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    };
    globalThis.cancelAnimationFrame = () => {};

    class LiveResizeObserver {
      private readonly cb: ResizeObserverCallback;
      constructor(cb: ResizeObserverCallback) {
        this.cb = cb;
      }
      observe(target: Element) {
        Object.defineProperty(target, "clientWidth", { configurable: true, value: 1200 });
        Object.defineProperty(target, "clientHeight", { configurable: true, value: 500 });
        queueMicrotask(() => this.cb([], this as unknown as ResizeObserver));
      }
      disconnect() {}
      unobserve() {}
    }
    globalThis.ResizeObserver = LiveResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    shell.remove();
  });

  it("keeps overlay hidden and pins salary adjacent to flex status after resize", () => {
    const engine = createGridEngine<Person>({
      modules: [SortModule, FilterModule],
      rowSelection: "multiple",
      getRowId: ({ data }) => String(data.id),
      columnDefs: employeeColumnDefs,
      rowData: Array.from({ length: 100 }, (_, i) => makeRow(i + 1)),
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);

    const overlay = host.querySelector<HTMLElement>(".ol-grid__overlay");
    const frame = engine.getLastFrame()!;

    expect(frame.overlayLoading).toBe(false);
    expect(frame.overlayNoRows).toBe(false);
    expect(overlay?.hidden).toBe(true);

    const centerScroll = host.querySelector<HTMLElement>(".ol-grid__center-scroll");
    const headerPinnedRight = host.querySelector<HTMLElement>(".ol-grid__header-pinned-right");
    const status = frame.centerColumns.find((col) => col.colId === "status");
    const fixedCenterWidth = frame.centerColumns
      .filter((col) => col.colId !== "status")
      .reduce((sum, col) => sum + col.width, 0);

    expect(frame.centerWidth).toBe(frame.centerViewportWidth);
    expect(status?.width).toBe(frame.centerViewportWidth - fixedCenterWidth);
    expect(status!.width).toBeGreaterThan(200);
    expect(headerPinnedRight!.offsetLeft).toBe(
      centerScroll!.offsetLeft + centerScroll!.offsetWidth,
    );
  });
});
