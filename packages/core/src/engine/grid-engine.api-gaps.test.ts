/** @vitest-environment happy-dom */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { OlGridError, ModuleRegistry } from "@ol-grid/core";
import { FilterModule } from "@ol-grid/filter";
import { SortModule } from "@ol-grid/sort";
import { createGridEngine } from "./grid-engine.js";

interface Person {
  id: number;
  name: string;
}

describe("GridEngine API gaps", () => {
  let host: HTMLElement;

  beforeEach(() => {
    ModuleRegistry.reset();
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

  it("throws when setSortModel is called without SortModule", () => {
    const engine = createGridEngine<Person>({
      columnDefs: [{ field: "name", width: 120 }],
      rowData: [{ id: 1, name: "Ann" }],
    });

    expect(() => engine.getApi().setSortModel([{ colId: "name", sort: "asc" }])).toThrow(
      OlGridError,
    );
    expect(() => engine.getApi().setSortModel([{ colId: "name", sort: "asc" }])).toThrow(
      /SortModule is not registered/,
    );
    engine.destroy();
  });

  it("throws when setFilterModel is called without FilterModule", () => {
    const engine = createGridEngine<Person>({
      columnDefs: [{ field: "name", width: 120, filter: "text" }],
      rowData: [{ id: 1, name: "Ann" }],
    });

    expect(() =>
      engine.getApi().setFilterModel({
        name: { filterType: "text", type: "contains", filter: "a" },
      }),
    ).toThrow(/FilterModule is not registered/);
    engine.destroy();
  });

  it("api.onFilterChanged receives filterChanged events", () => {
    const engine = createGridEngine<Person>({
      modules: [FilterModule],
      columnDefs: [{ field: "name", width: 120, filter: "text" }],
      rowData: [
        { id: 1, name: "Ann" },
        { id: 2, name: "Bob" },
      ],
    });

    const sources: string[] = [];
    const unsubscribe = engine.getApi().onFilterChanged((event) => {
      sources.push(event.source);
    });

    engine.getApi().setFilterModel({
      name: { filterType: "text", type: "contains", filter: "a" },
    });
    engine.getApi().setQuickFilterText("bob");

    expect(sources).toEqual(["api", "quickFilter"]);
    unsubscribe();
    engine.destroy();
  });

  it("addEventListener and removeEventListener work for filterChanged", () => {
    const engine = createGridEngine<Person>({
      modules: [FilterModule],
      columnDefs: [{ field: "name", width: 120, filter: "text" }],
      rowData: [{ id: 1, name: "Ann" }],
    });

    let count = 0;
    const listener = () => {
      count++;
    };
    engine.getApi().addEventListener("filterChanged", listener);
    engine.getApi().setQuickFilterText("a");
    expect(count).toBe(1);

    engine.getApi().removeEventListener("filterChanged", listener);
    engine.getApi().setQuickFilterText("b");
    expect(count).toBe(1);
    engine.destroy();
  });

  it("selectAll and deselectAll update selection", () => {
    const engine = createGridEngine<Person>({
      rowSelection: "multiple",
      columnDefs: [{ field: "name", width: 120 }],
      rowData: [
        { id: 1, name: "Ann" },
        { id: 2, name: "Bob" },
      ],
      getRowId: ({ data }) => String(data.id),
    });

    engine.getApi().selectAll();
    expect(engine.getApi().getSelectedRows()).toHaveLength(2);

    engine.getApi().deselectAll();
    expect(engine.getApi().getSelectedRows()).toHaveLength(0);
    engine.destroy();
  });

  it("applyColumnState emits displayedColumnsChanged when hide changes", () => {
    const engine = createGridEngine<Person>({
      columnDefs: [
        { field: "name", width: 120 },
        { field: "id", width: 80 },
      ],
      rowData: [{ id: 1, name: "Ann" }],
    });

    let fired = 0;
    engine.getOptions().onDisplayedColumnsChanged = () => {
      fired++;
    };

    engine.getApi().applyColumnState({
      state: [{ colId: "id", hide: true }],
    });
    expect(fired).toBe(1);

    engine.getApi().applyColumnState({
      state: [{ colId: "id", hide: false }],
    });
    expect(fired).toBe(2);
    engine.destroy();
  });

  it("shift+click selects inclusive row range", () => {
    const engine = createGridEngine<Person>({
      rowSelection: "multiple",
      columnDefs: [{ field: "name", width: 120 }],
      rowData: [
        { id: 1, name: "A" },
        { id: 2, name: "B" },
        { id: 3, name: "C" },
        { id: 4, name: "D" },
      ],
      getRowId: ({ data }) => String(data.id),
    });

    engine.handleRowClick("1", { metaKey: false, ctrlKey: false, shiftKey: false });
    engine.handleRowClick("3", { metaKey: false, ctrlKey: false, shiftKey: true });

    expect(engine.getApi().getSelectedRows().map((row) => row.id)).toEqual([1, 2, 3]);
    engine.destroy();
  });

  it("fires onFilterOpened when column filter opens", () => {
    const engine = createGridEngine<Person>({
      modules: [FilterModule],
      columnDefs: [{ field: "name", width: 120, filter: "text" }],
      rowData: [{ id: 1, name: "Ann" }],
    });

    const opened: string[] = [];
    engine.getOptions().onFilterOpened = (event) => {
      opened.push(event.colId);
    };

    engine.openColumnFilter("name");
    expect(opened).toEqual(["name"]);
    engine.destroy();
  });
});
