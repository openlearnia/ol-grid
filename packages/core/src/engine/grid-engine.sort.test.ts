/** @vitest-environment happy-dom */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { SortModule } from "@ol-grid/sort";
import { createGridEngine } from "./grid-engine.js";

interface Person {
  id: number;
  name: string;
  role: string;
}

describe("GridEngine sort API", () => {
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

  it("setSortModel and getSortModel stay in sync with row order", () => {
    const rowData: Person[] = [
      { id: 1, name: "Charlie", role: "PM" },
      { id: 2, name: "Alice", role: "Engineer" },
      { id: 3, name: "Bob", role: "Designer" },
    ];

    const engine = createGridEngine<Person>({
      modules: [SortModule],
      getRowId: ({ data }) => String(data.id),
      columnDefs: [
        { field: "name", headerName: "Name", width: 140 },
        { field: "role", headerName: "Role", width: 120 },
      ],
      rowData,
    });

    engine.getApi().setSortModel([{ colId: "name", sort: "asc" }]);
    expect(engine.getApi().getSortModel()).toEqual([{ colId: "name", sort: "asc" }]);

    const names: string[] = [];
    engine.getRowModel().forEachNode((node) => {
      names.push(node.data?.name ?? "");
    });
    expect(names).toEqual(["Alice", "Bob", "Charlie"]);
  });

  it("merges defaultColDef into column defs before sortable checks", () => {
    const engine = createGridEngine<Person>({
      defaultColDef: { sortable: false },
      columnDefs: [
        { field: "name", headerName: "Name", width: 140, sortable: true },
        { field: "role", headerName: "Role", width: 120 },
      ],
      rowData: [{ id: 1, name: "Alice", role: "Engineer" }],
    });

    const nameColumn = engine.getColumnModel().getByColId("name");
    const roleColumn = engine.getColumnModel().getByColId("role");

    expect(nameColumn?.def.sortable).toBe(true);
    expect(roleColumn?.def.sortable).toBe(false);
  });
});
