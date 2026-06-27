/** @vitest-environment happy-dom */
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ModuleRegistry } from "@ol-grid/core";
import { SortModule } from "@ol-grid/sort";
import { FilterModule } from "@ol-grid/filter";
import { PaginationModule } from "@ol-grid/pagination";
import { OlGrid, type OlGridHandle } from "../ol-grid.js";
import type { ColumnDef } from "@ol-grid/core";
import { simulateColumnHeaderDrag } from "@ol-grid/dom-renderer";

function installDomMocks(width = 1200, height = 480): void {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  };
  globalThis.cancelAnimationFrame = () => {};
  globalThis.ResizeObserver = class {
    observe(target: Element) {
      Object.defineProperty(target, "clientWidth", { configurable: true, value: width });
      Object.defineProperty(target, "clientHeight", { configurable: true, value: height - 80 });
    }
    disconnect() {}
    unobserve() {}
  } as typeof ResizeObserver;
}

function mockHeaderRects(host: HTMLElement, layout: Record<string, { left: number; width: number }>) {
  for (const [colId, rect] of Object.entries(layout)) {
    const header = host.querySelector<HTMLElement>(`[data-col-id="${colId}"][role="columnheader"]`);
    expect(header).not.toBeNull();
    const { left, width } = rect;
    vi.spyOn(header!, "getBoundingClientRect").mockReturnValue({
      left,
      top: 0,
      width,
      height: 32,
      right: left + width,
      bottom: 32,
      x: left,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
  }
}

const demoColumnDefs: ColumnDef[] = [
  { field: "id", headerName: "ID", width: 72, pinned: "left" },
  { field: "name", headerName: "Name", width: 140, pinned: "left" },
  {
    headerName: "Organization",
    groupId: "organization",
    children: [
      { field: "role", headerName: "Role", width: 120 },
      { field: "department", headerName: "Department", width: 130 },
      { field: "location", headerName: "Location", width: 110 },
    ],
  },
  {
    headerName: "Timeline",
    groupId: "timeline",
    children: [
      { field: "joinDate", headerName: "Join date", width: 110 },
      { field: "startYear", headerName: "Start", width: 90 },
    ],
  },
  { field: "salary", headerName: "Salary", width: 110, pinned: "right" },
  { field: "status", headerName: "Status", width: 120 },
];

describe("OlGrid column drag reorder", () => {
  let root: Root | null = null;

  beforeEach(() => {
    ModuleRegistry.clear();
    ModuleRegistry.register(SortModule);
    ModuleRegistry.register(FilterModule);
    ModuleRegistry.register(PaginationModule);
    installDomMocks();
  });

  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    vi.restoreAllMocks();
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("persists reorder with static columnDefs prop (React demo layout)", () => {
    const gridRef: { current: OlGridHandle | null } = { current: null };
    const host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    act(() => {
      root!.render(
        createElement(OlGrid, {
          ref: gridRef,
          columnDefs: demoColumnDefs,
          rowData: [
            {
              id: 1,
              name: "Alice",
              role: "Engineer",
              department: "Platform",
              location: "Remote",
              joinDate: "2015-01-15",
              startYear: 2015,
              salary: 70000,
              status: "Active",
            },
          ],
          rowSelection: "multiple",
          style: { width: 1200, height: 480 },
        }),
      );
    });

    mockHeaderRects(host, {
      role: { left: 320, width: 120 },
      department: { left: 440, width: 130 },
      location: { left: 570, width: 110 },
      joinDate: { left: 680, width: 110 },
      startYear: { left: 790, width: 90 },
      status: { left: 880, width: 120 },
    });

    const roleHeader = host.querySelector<HTMLElement>(
      '[data-col-id="role"][role="columnheader"]',
    )!;

    act(() => {
      simulateColumnHeaderDrag(roleHeader, {
        fromX: 340,
        fromY: 48,
        toX: 470,
        toY: 48,
      }, host.querySelector<HTMLElement>('[data-col-id="department"][role="columnheader"]')!);
    });

    expect(gridRef.current?.grid.getColumnModel().getCenterColumns().map((col) => col.colId)).toEqual([
      "department",
      "role",
      "location",
      "joinDate",
      "startYear",
      "status",
    ]);

    // OlGrid re-render from store subscription must not reset order via static columnDefs prop.
    act(() => {
      root!.render(
        createElement(OlGrid, {
          ref: gridRef,
          columnDefs: demoColumnDefs,
          rowData: [
            {
              id: 1,
              name: "Alice",
              role: "Engineer",
              department: "Platform",
              location: "Remote",
              joinDate: "2015-01-15",
              startYear: 2015,
              salary: 70000,
              status: "Active",
            },
          ],
          rowSelection: "multiple",
          style: { width: 1200, height: 480 },
        }),
      );
    });

    expect(gridRef.current?.grid.getColumnModel().getCenterColumns().map((col) => col.colId)).toEqual([
      "department",
      "role",
      "location",
      "joinDate",
      "startYear",
      "status",
    ]);
  });

  it("swaps manager and project on wide 100k-style column defs", () => {
    const extraFields = ["team", "level", "office", "manager", "project", "skills", "notes"] as const;
    const wideColumnDefs: ColumnDef[] = [
      { field: "id", headerName: "ID", width: 72, pinned: "left" },
      { field: "name", headerName: "Name", width: 140, pinned: "left" },
      {
        headerName: "Organization",
        groupId: "organization",
        children: [
          { field: "role", headerName: "Role", width: 120 },
          { field: "department", headerName: "Department", width: 130 },
          { field: "location", headerName: "Location", width: 110 },
        ],
      },
      {
        headerName: "Timeline",
        groupId: "timeline",
        children: [
          { field: "joinDate", headerName: "Join date", width: 110 },
          { field: "startYear", headerName: "Start", width: 90 },
        ],
      },
      { field: "salary", headerName: "Salary", width: 110, pinned: "right" },
      { field: "status", headerName: "Status", width: 120 },
      ...extraFields.map((field) => ({ field, headerName: field, width: 120 })),
    ];

    const row = {
      id: 1,
      name: "Alice",
      role: "Engineer",
      department: "Platform",
      location: "Remote",
      joinDate: "2015-01-15",
      startYear: 2015,
      salary: 70000,
      status: "Active",
      team: "Team 1",
      level: "L1",
      office: "NYC",
      manager: "Mgr 1",
      project: "Project 1",
      skills: "Go",
      notes: "Note",
    };

    const gridRef: { current: OlGridHandle | null } = { current: null };
    const host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    act(() => {
      root!.render(
        createElement(OlGrid, {
          ref: gridRef,
          columnDefs: wideColumnDefs,
          rowData: [row],
          rowSelection: "multiple",
          style: { width: 1200, height: 480 },
        }),
      );
    });

    mockHeaderRects(host, {
      office: { left: 820, width: 120 },
      manager: { left: 940, width: 120 },
      project: { left: 1060, width: 120 },
      skills: { left: 1180, width: 120 },
    });

    const projectHeader = host.querySelector<HTMLElement>(
      '[data-col-id="project"][role="columnheader"]',
    )!;

    act(() => {
      simulateColumnHeaderDrag(projectHeader, {
        fromX: 1080,
        fromY: 48,
        toX: 980,
        toY: 48,
      }, host.querySelector<HTMLElement>('[data-col-id="manager"][role="columnheader"]')!);
    });

    const centerOrder = gridRef.current?.grid.getColumnModel().getCenterColumns().map((col) => col.colId);
    expect(centerOrder?.indexOf("project")).toBeLessThan(centerOrder?.indexOf("manager") ?? 0);

    act(() => {
      root!.render(
        createElement(OlGrid, {
          ref: gridRef,
          columnDefs: wideColumnDefs,
          rowData: [row],
          rowSelection: "multiple",
          style: { width: 1200, height: 480 },
        }),
      );
    });

    const afterRerender = gridRef.current?.grid.getColumnModel().getCenterColumns().map((col) => col.colId);
    expect(afterRerender?.indexOf("project")).toBeLessThan(afterRerender?.indexOf("manager") ?? 0);
  });
});
