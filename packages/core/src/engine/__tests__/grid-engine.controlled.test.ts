/** @vitest-environment happy-dom */
import { FilterModule } from "@ol-grid/filter";
import { SortModule } from "@ol-grid/sort";
import { beforeEach, describe, expect, it } from "vitest";
import { ModuleRegistry } from "../../modules/module-registry.js";
import { createGridEngine } from "../grid-engine.js";

describe("GridEngine controlled mode", () => {
  beforeEach(() => {
    ModuleRegistry.clear();
    ModuleRegistry.register(SortModule);
    ModuleRegistry.register(FilterModule);
  });

  it("fires onSortModelChange when sort changes from UI", () => {
    const changes: Array<Array<{ colId: string; sort: "asc" | "desc" }>> = [];
    const engine = createGridEngine({
      columnDefs: [{ field: "name", headerName: "Name" }],
      rowData: [{ name: "Bob" }, { name: "Alice" }],
      getRowId: ({ data }) => String((data as { name: string }).name),
      modules: [SortModule],
      onSortModelChange: (model) => changes.push(model),
    });

    engine.toggleColumnSort("name");
    expect(changes).toHaveLength(1);
    expect(changes[0]).toEqual([{ colId: "name", sort: "asc" }]);
    expect(engine.getApi().getSortModel()).toEqual(changes[0]);
    engine.destroy();
  });

  it("syncs selectedRowIds from controlled prop via setOption", () => {
    const selectionChanges: string[][] = [];
    const engine = createGridEngine({
      columnDefs: [{ field: "id" }],
      rowData: [{ id: 1 }, { id: 2 }, { id: 3 }],
      getRowId: ({ data }) => String((data as { id: number }).id),
      rowSelection: "multiple",
      selectedRowIds: ["1"],
      onSelectionChange: (ids) => selectionChanges.push(ids),
    });

    expect([...engine.getStore().getState().selection!.selectedRowIds]).toEqual(["1"]);

    engine.setOption("selectedRowIds", ["2", "3"]);
    expect([...engine.getStore().getState().selection!.selectedRowIds]).toEqual(["2", "3"]);
    expect(selectionChanges).toHaveLength(0);

    engine.handleRowClick("1", { metaKey: false, ctrlKey: false, shiftKey: false });
    expect(selectionChanges).toHaveLength(1);
    expect(selectionChanges[0]).toEqual(["1"]);
    engine.destroy();
  });

  it("fires onFilterModelChange when filter model updates via API", () => {
    const changes: Record<string, unknown>[] = [];
    const engine = createGridEngine({
      columnDefs: [{ field: "name", filter: "text" }],
      rowData: [{ name: "Alice" }],
      getRowId: ({ data }) => String((data as { name: string }).name),
      modules: [SortModule, FilterModule],
      onFilterModelChange: (model) => changes.push(model),
    });

    engine.getApi().setFilterModel({
      name: { filterType: "text", type: "contains", filter: "Ali" },
    });
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      name: { filterType: "text", type: "contains", filter: "Ali" },
    });
    engine.destroy();
  });
});
