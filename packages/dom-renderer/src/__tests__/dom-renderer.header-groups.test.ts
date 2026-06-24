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

const groupedEmployeeColumnDefs = [
  { field: "id", headerName: "ID", width: 72, pinned: "left" as const },
  {
    field: "name",
    headerName: "Name",
    width: 140,
    pinned: "left" as const,
    filter: "text" as const,
    floatingFilter: true,
  },
  {
    headerName: "Organization",
    groupId: "organization",
    children: [
      { field: "role", headerName: "Role", width: 120, filter: "text" as const },
      { field: "department", headerName: "Department", width: 130, filter: "text" as const, floatingFilter: true },
      { field: "location", headerName: "Location", width: 110 },
    ],
  },
  {
    headerName: "Timeline",
    groupId: "timeline",
    children: [
      { field: "joinDate", headerName: "Join date", width: 110, filter: "date" as const },
      { field: "startYear", headerName: "Start", width: 90 },
    ],
  },
  {
    field: "salary",
    headerName: "Salary",
    width: 110,
    pinned: "right" as const,
    filter: "number" as const,
  },
  { field: "status", headerName: "Status", flex: 1 },
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

function setupHost(width = 900, height = 500): HTMLElement {
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

function leafOffsetLeft(host: HTMLElement, colId: string): number {
  const header = host.querySelector<HTMLElement>(`[data-col-id="${colId}"][role="columnheader"]`);
  expect(header).not.toBeNull();
  return header!.offsetLeft;
}

describe("DomRenderer grouped header layout", () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = setupHost();
  });

  afterEach(() => {
    host.remove();
  });

  it("uses grid layout with full group labels and rowSpan for ungrouped columns", () => {
    const engine = createGridEngine<Person>({
      modules: [FilterModule],
      getRowId: ({ data }) => String(data.id),
      columnDefs: groupedEmployeeColumnDefs,
      rowData: [makeRow(1)],
      defaultColDef: { floatingFilter: true },
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);

    const frame = engine.getLastFrame()!;
    expect(frame.headerRowCount).toBe(2);

    const centerHeaderScroll = host.querySelector<HTMLElement>(".ol-grid__header-rows-scroll");
    const pinnedLeftHeader = host.querySelector<HTMLElement>(".ol-grid__header-pinned-left");
    const pinnedRightHeader = host.querySelector<HTMLElement>(".ol-grid__header-pinned-right");

    expect(centerHeaderScroll?.classList.contains("ol-grid__header-grid")).toBe(true);
    expect(pinnedLeftHeader?.classList.contains("ol-grid__header-grid")).toBe(true);
    expect(pinnedRightHeader?.classList.contains("ol-grid__header-grid")).toBe(true);

    const organization = host.querySelector<HTMLElement>("[data-group-id='organization'] .ol-grid__header-label");
    const role = host.querySelector<HTMLElement>("[data-col-id='role'] .ol-grid__header-label");
    const status = host.querySelector<HTMLElement>("[data-col-id='status'] .ol-grid__header-label");
    const salary = host.querySelector<HTMLElement>("[data-col-id='salary'] .ol-grid__header-label");
    const name = host.querySelector<HTMLElement>("[data-col-id='name'] .ol-grid__header-label");

    expect(organization?.textContent).toBe("Organization");
    expect(role?.textContent).toBe("Role");
    expect(status?.textContent).toBe("Status");
    expect(salary?.textContent).toBe("Salary");
    expect(name?.textContent).toBe("Name");

    const organizationGroup = frame.centerHeaderRows[0]!.cells.find((cell) => cell.groupId === "organization");
    const timelineGroup = frame.centerHeaderRows[0]!.cells.find((cell) => cell.groupId === "timeline");
    const statusHeader = frame.centerHeaderRows[0]!.cells.find((cell) => cell.colId === "status");
    const roleWidth = frame.centerColumns.find((col) => col.colId === "role")!.width;
    const deptWidth = frame.centerColumns.find((col) => col.colId === "department")!.width;
    const locWidth = frame.centerColumns.find((col) => col.colId === "location")!.width;
    const joinWidth = frame.centerColumns.find((col) => col.colId === "joinDate")!.width;
    const startWidth = frame.centerColumns.find((col) => col.colId === "startYear")!.width;

    expect(organizationGroup?.width).toBe(roleWidth + deptWidth + locWidth);
    expect(timelineGroup?.width).toBe(joinWidth + startWidth);
    expect(statusHeader?.rowSpan).toBe(2);

    const pinnedName = frame.pinnedLeftHeaderRows[0]!.cells.find((cell) => cell.colId === "name");
    const pinnedId = frame.pinnedLeftHeaderRows[0]!.cells.find((cell) => cell.colId === "id");
    expect(pinnedName?.rowSpan).toBe(2);
    expect(pinnedId?.rowSpan).toBe(2);

    const salaryHeader = frame.pinnedRightHeaderRows[0]!.cells.find((cell) => cell.colId === "salary");
    expect(salaryHeader?.rowSpan).toBe(2);
  });

  it("aligns leaf headers and floating filters with body columns", () => {
    const engine = createGridEngine<Person>({
      modules: [FilterModule],
      getRowId: ({ data }) => String(data.id),
      columnDefs: groupedEmployeeColumnDefs,
      rowData: [makeRow(1)],
      defaultColDef: { floatingFilter: true },
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);

    const roleHeaderLeft = leafOffsetLeft(host, "role");
    const roleFilter = host.querySelector<HTMLElement>(".ol-grid__floating-filter-host[data-col-id='role']");
    const roleCell = host.querySelector<HTMLElement>(".ol-grid__cell[data-col-id='role']");

    expect(roleFilter?.offsetLeft).toBe(roleHeaderLeft);
    expect(roleCell?.offsetLeft).toBe(roleHeaderLeft);

    const departmentHeaderLeft = leafOffsetLeft(host, "department");
    const departmentFilter = host.querySelector<HTMLElement>(
      ".ol-grid__floating-filter-host[data-col-id='department']",
    );
    expect(departmentFilter?.offsetLeft).toBe(departmentHeaderLeft);
  });

  it("syncs center header and floating filter scroll with body horizontal scroll", () => {
    const wideColumnDefs = [
      ...groupedEmployeeColumnDefs.slice(0, -1),
      { field: "status", headerName: "Status", width: 120 },
      { field: "notes", headerName: "Notes", width: 180 },
      { field: "region", headerName: "Region", width: 160 },
    ];

    const engine = createGridEngine<Person>({
      modules: [FilterModule],
      getRowId: ({ data }) => String(data.id),
      columnDefs: wideColumnDefs,
      rowData: [makeRow(1)],
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);

    const centerScroll = host.querySelector<HTMLElement>(".ol-grid__center-scroll")!;
    const headerCenterScroll = host.querySelector<HTMLElement>(".ol-grid__header-rows-scroll")!;
    const floatingCenterRow = host.querySelector<HTMLElement>(".ol-grid__floating-filter-row--center")!;

    centerScroll.scrollLeft = 150;
    centerScroll.dispatchEvent(new Event("scroll"));

    expect(headerCenterScroll.style.transform).toBe("translate3d(-150px, 0, 0)");
    expect(floatingCenterRow.style.transform).toBe("translate3d(-150px, 0, 0)");
    expect(engine.getStore().getState().scrollLeft).toBe(150);
  });

  it("sorts when clicking a grouped leaf header such as Role", () => {
    const rowData: Person[] = [
      { id: 1, name: "User 1", role: "PM", department: "Platform", location: "Remote", startYear: 2020, joinDate: "2020-01-15", salary: 90000, status: "Active" },
      { id: 2, name: "User 2", role: "Engineer", department: "Product", location: "NYC", startYear: 2021, joinDate: "2021-02-10", salary: 95000, status: "Active" },
      { id: 3, name: "User 3", role: "Designer", department: "Growth", location: "London", startYear: 2019, joinDate: "2019-06-01", salary: 88000, status: "Active" },
    ];

    const engine = createGridEngine<Person>({
      modules: [SortModule, FilterModule],
      getRowId: ({ data }) => String(data.id),
      columnDefs: groupedEmployeeColumnDefs,
      rowData,
      defaultColDef: { floatingFilter: true },
    });

    const renderer = createDomRenderer();
    engine.mount(host, renderer);

    const roleHeader = host.querySelector<HTMLElement>(
      '[data-col-id="role"][role="columnheader"]',
    );
    expect(roleHeader).not.toBeNull();
    roleHeader!.click();

    expect(engine.getApi().getSortModel()).toEqual([{ colId: "role", sort: "asc" }]);

    const roles: string[] = [];
    engine.getRowModel().forEachNode((node) => {
      roles.push(node.data?.role ?? "");
    });
    expect(roles).toEqual(["Designer", "Engineer", "PM"]);
  });
});
