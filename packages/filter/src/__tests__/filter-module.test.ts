import { describe, expect, it } from "vitest";
import { createGridEngine } from "@ol-grid/core";
import { FilterModule } from "../filter-module.js";
import { SortModule } from "@ol-grid/sort";

interface Row {
  name: string;
  salary: number;
}

describe("FilterModule integration", () => {
  it("registers column filter stage before sort", () => {
    const engine = createGridEngine<Row>({
      modules: [FilterModule, SortModule],
      columnDefs: [
        { field: "name", headerName: "Name", width: 120, filter: "text" },
        { field: "salary", headerName: "Salary", width: 100, filter: "number" },
      ],
      rowData: [
        { name: "Charlie", salary: 90000 },
        { name: "Alice", salary: 70000 },
        { name: "Bob", salary: 110000 },
      ],
    });

    engine.getApi().setFilterModel({
      name: { filterType: "text", type: "contains", filter: "a" },
    });
    engine.getApi().setSortModel([{ colId: "name", sort: "asc" }]);

    const names: string[] = [];
    engine.getRowModel().forEachNode((node) => {
      names.push(node.data?.name ?? "");
    });

    expect(names).toEqual(["Alice", "Charlie"]);
    expect(engine.getApi().getFilterModel()).toEqual({
      name: { filterType: "text", type: "contains", filter: "a" },
    });

    engine.destroy();
  });

  it("round-trips setFilterModel and destroyFilter", () => {
    const engine = createGridEngine<Row>({
      modules: [FilterModule],
      columnDefs: [{ field: "name", filter: "text" }],
      rowData: [{ name: "Alice", salary: 1 }],
    });

    engine.getApi().setFilterModel({
      name: { filterType: "text", type: "equals", filter: "Alice" },
    });
    expect(engine.getApi().getDisplayedRowCount()).toBe(1);

    engine.getApi().destroyFilter("name");
    expect(engine.getApi().getFilterModel()).toEqual({});
    expect(engine.getApi().getDisplayedRowCount()).toBe(1);

    engine.destroy();
  });
});
