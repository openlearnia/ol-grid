/** @vitest-environment happy-dom */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { handleEnd, isDragState, state } from "@ol-grid/drag-and-drop";
import { createGridEngine } from "@ol-grid/core";
import { createDomRenderer } from "../dom-renderer.js";
import { simulateColumnHeaderDrag, simulateColumnHeaderDragOver } from "../column-header-dnd.js";

interface Person {
  id: number;
  name: string;
  role: string;
  department?: string;
  location?: string;
  joinDate?: string;
  startYear?: number;
  salary?: number;
  status?: string;
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
    observe(target: Element) {
      Object.defineProperty(target, "clientWidth", { configurable: true, value: width });
      Object.defineProperty(target, "clientHeight", { configurable: true, value: height - 80 });
    }
    disconnect() {}
    unobserve() {}
  };

  return host;
}

function mockHeaderRects(host: HTMLElement, layout: Record<string, { left: number; width: number }>) {
  for (const [colId, rect] of Object.entries(layout)) {
    const header = host.querySelector<HTMLElement>(`[data-col-id="${colId}"][role="columnheader"]`);
    expect(header).not.toBeNull();
    const left = rect.left;
    const width = rect.width;
    const box = {
      left,
      top: 0,
      width,
      height: 32,
      right: left + width,
      bottom: 32,
      x: left,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;
    vi.spyOn(header!, "getBoundingClientRect").mockReturnValue(box);
  }
}

describe("DomRenderer column drag reorder", () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = setupHost();
  });

  afterEach(() => {
    if (isDragState(state)) {
      handleEnd(state);
    }
    host.remove();
    vi.restoreAllMocks();
  });

  it("reorders columns live during drag hover before drop", () => {
    const onColumnMoved = vi.fn();
    const engine = createGridEngine<Person>({
      columnDefs: [
        { field: "name", headerName: "Name", width: 160 },
        { field: "role", headerName: "Role", width: 160 },
        { field: "department", headerName: "Department", width: 160 },
      ],
      rowData: [{ id: 1, name: "Alice", role: "Engineer", department: "Platform" }],
      onColumnMoved,
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);

    mockHeaderRects(host, {
      name: { left: 200, width: 160 },
      role: { left: 360, width: 160 },
      department: { left: 520, width: 160 },
    });

    const roleHeader = host.querySelector<HTMLElement>(
      '[data-col-id="role"][role="columnheader"]',
    )!;
    const departmentHeader = host.querySelector<HTMLElement>(
      '[data-col-id="department"][role="columnheader"]',
    )!;

    simulateColumnHeaderDragOver(
      roleHeader,
      { fromX: 380, fromY: 16, toX: 560, toY: 16 },
      departmentHeader,
    );

    expect(engine.getColumnModel().getCenterColumns().map((col) => col.colId)).toEqual([
      "name",
      "department",
      "role",
    ]);

    const headerOrder = [
      ...host.querySelectorAll<HTMLElement>(
        '.ol-grid__header-rows-scroll [data-col-id][role="columnheader"]',
      ),
    ].map((el) => el.dataset.colId);
    expect(headerOrder).toEqual(["name", "department", "role"]);

    const centerBodyRow = host.querySelector<HTMLElement>(".ol-grid__rows--center .ol-grid__row");
    const bodyOrder = [
      ...centerBodyRow!.querySelectorAll<HTMLElement>('[role="gridcell"][data-col-id]'),
    ].map((el) => el.dataset.colId);
    expect(bodyOrder).toEqual(["name", "department", "role"]);

    expect(onColumnMoved).toHaveBeenCalledWith(
      expect.objectContaining({ colId: "role", finished: false }),
    );

    roleHeader.dispatchEvent(new DragEvent("dragend", { bubbles: true }));
    if (isDragState(state)) {
      handleEnd(state);
    }
    expect(onColumnMoved).toHaveBeenCalledWith(
      expect.objectContaining({ colId: "role", finished: true }),
    );
  });

  it("completes header drop without tearing down drag state mid-flight", () => {
    const engine = createGridEngine<Person>({
      columnDefs: [
        { field: "name", headerName: "Name", width: 160 },
        { field: "role", headerName: "Role", width: 160 },
        { field: "department", headerName: "Department", width: 160 },
      ],
      rowData: [{ id: 1, name: "Alice", role: "Engineer", department: "Platform" }],
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);

    mockHeaderRects(host, {
      name: { left: 200, width: 160 },
      role: { left: 360, width: 160 },
      department: { left: 520, width: 160 },
    });

    const roleHeader = host.querySelector<HTMLElement>(
      '[data-col-id="role"][role="columnheader"]',
    )!;
    const departmentHeader = host.querySelector<HTMLElement>(
      '[data-col-id="department"][role="columnheader"]',
    )!;

    // sort() during drag used to call moveColumn → renderFrame → tearDown → resetState,
    // leaving draggedNodes undefined when handleEnd ran on drop.
    expect(() =>
      simulateColumnHeaderDrag(
        roleHeader,
        { fromX: 380, fromY: 16, toX: 560, toY: 16 },
        departmentHeader,
      ),
    ).not.toThrow();

    expect(engine.getColumnModel().getCenterColumns().map((col) => col.colId)).toEqual([
      "name",
      "department",
      "role",
    ]);
  });

  it("reorders center columns after drag-drop on header", () => {
    const engine = createGridEngine<Person>({
      columnDefs: [
        { field: "name", headerName: "Name", width: 160 },
        { field: "role", headerName: "Role", width: 160 },
      ],
      rowData: [
        { id: 1, name: "Alice", role: "Engineer" },
        { id: 2, name: "Bob", role: "PM" },
      ],
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);

    mockHeaderRects(host, {
      name: { left: 200, width: 160 },
      role: { left: 360, width: 160 },
    });

    const roleHeader = host.querySelector<HTMLElement>(
      '[data-col-id="role"][role="columnheader"]',
    )!;

    simulateColumnHeaderDrag(roleHeader, {
      fromX: 380,
      fromY: 16,
      toX: 250,
      toY: 16,
    }, host.querySelector<HTMLElement>('[data-col-id="name"][role="columnheader"]')!);

    expect(engine.getColumnModel().getCenterColumns().map((col) => col.colId)).toEqual([
      "role",
      "name",
    ]);
  });

  it("does not sort when finishing a column drag", () => {
    const engine = createGridEngine<Person>({
      columnDefs: [
        { field: "name", headerName: "Name", width: 160, sortable: true },
        { field: "role", headerName: "Role", width: 160, sortable: true },
      ],
      rowData: [
        { id: 1, name: "Bob", role: "PM" },
        { id: 2, name: "Alice", role: "Engineer" },
      ],
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);

    mockHeaderRects(host, {
      name: { left: 200, width: 160 },
      role: { left: 360, width: 160 },
    });

    const nameHeader = host.querySelector<HTMLElement>(
      '[data-col-id="name"][role="columnheader"]',
    )!;
    const roleHeader = host.querySelector<HTMLElement>(
      '[data-col-id="role"][role="columnheader"]',
    )!;

    simulateColumnHeaderDrag(nameHeader, {
      fromX: 220,
      fromY: 16,
      toX: 420,
      toY: 16,
    }, roleHeader);
    nameHeader.click();

    expect(engine.getApi().getSortModel()).toEqual([]);
  });

  it("reorders grouped center columns when row-span leaf DOM order differs from visual order", () => {
    const engine = createGridEngine<Person>({
      rowSelection: "multiple",
      columnDefs: [
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
      ],
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
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);

    // Status row-spans in the grouped grid so it precedes Role in DOM, but sits last visually.
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

    simulateColumnHeaderDrag(roleHeader, {
      fromX: 340,
      fromY: 48,
      toX: 470,
      toY: 48,
    }, host.querySelector<HTMLElement>('[data-col-id="department"][role="columnheader"]')!);

    expect(engine.getColumnModel().getCenterColumns().map((col) => col.colId)).toEqual([
      "department",
      "role",
      "location",
      "joinDate",
      "startYear",
      "status",
    ]);
  });

  it("swaps manager and project on 100k wide flat center columns (React demo)", () => {
    const extraFields = [
      "team",
      "level",
      "office",
      "manager",
      "project",
      "skills",
      "notes",
    ] as const;

    const engine = createGridEngine<Person & Record<string, string>>({
      rowSelection: "multiple",
      columnDefs: [
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
      ],
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
          team: "Team 1",
          level: "L1",
          office: "NYC",
          manager: "Mgr 1",
          project: "Project 1",
          skills: "Go",
          notes: "Note",
        },
      ],
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);

    mockHeaderRects(host, {
      office: { left: 820, width: 120 },
      manager: { left: 940, width: 120 },
      project: { left: 1060, width: 120 },
      skills: { left: 1180, width: 120 },
    });

    const centerBefore = engine.getColumnModel().getCenterColumns().map((col) => col.colId);
    expect(centerBefore.indexOf("manager")).toBeLessThan(centerBefore.indexOf("project"));

    const projectHeader = host.querySelector<HTMLElement>(
      '[data-col-id="project"][role="columnheader"]',
    )!;

    simulateColumnHeaderDrag(projectHeader, {
      fromX: 1080,
      fromY: 48,
      toX: 980,
      toY: 48,
    }, host.querySelector<HTMLElement>('[data-col-id="manager"][role="columnheader"]')!);

    const centerAfter = engine.getColumnModel().getCenterColumns().map((col) => col.colId);
    expect(centerAfter.indexOf("project")).toBeLessThan(centerAfter.indexOf("manager"));
  });
});
