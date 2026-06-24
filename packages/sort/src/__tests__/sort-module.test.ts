import { describe, expect, it } from "vitest";
import { createGridEngine } from "@ol-grid/core";
import { SortModule } from "@ol-grid/sort";

interface Row {
  name: string;
}

describe("SortModule integration", () => {
  it("registers sort pipeline stage via ModuleRegistry", () => {
    const engine = createGridEngine<Row>({
      modules: [SortModule],
      columnDefs: [{ field: "name", headerName: "Name", width: 120 }],
      rowData: [{ name: "Charlie" }, { name: "Alice" }, { name: "Bob" }],
    });

    engine.getApi().setSortModel([{ colId: "name", sort: "asc" }]);

    const names: string[] = [];
    engine.getRowModel().forEachNode((node) => {
      names.push(node.data?.name ?? "");
    });

    expect(names).toEqual(["Alice", "Bob", "Charlie"]);
    engine.destroy();
  });

  it("sorts leaf columns nested inside column groups", () => {
    const engine = createGridEngine<Row & { role: string }>({
      modules: [SortModule],
      getRowId: ({ data }) => String((data as { id?: number }).id ?? data.name),
      columnDefs: [
        { field: "name", headerName: "Name", width: 140 },
        {
          headerName: "Organization",
          groupId: "organization",
          children: [{ field: "role", headerName: "Role", width: 120 }],
        },
      ],
      rowData: [
        { name: "A", role: "PM" },
        { name: "B", role: "Engineer" },
        { name: "C", role: "Designer" },
      ],
    });

    engine.getApi().setSortModel([{ colId: "role", sort: "asc" }]);

    const roles: string[] = [];
    engine.getRowModel().forEachNode((node) => {
      roles.push(node.data?.role ?? "");
    });

    expect(roles).toEqual(["Designer", "Engineer", "PM"]);
    engine.destroy();
  });

  it("applies multi-column sort model in pipeline order", () => {
    interface Employee {
      country: string;
      city: string;
    }

    const engine = createGridEngine<Employee>({
      modules: [SortModule],
      columnDefs: [
        { field: "country", headerName: "Country", width: 120 },
        { field: "city", headerName: "City", width: 120 },
      ],
      rowData: [
        { country: "US", city: "Boston" },
        { country: "US", city: "Austin" },
        { country: "UK", city: "London" },
      ],
    });

    engine.getApi().setSortModel([
      { colId: "country", sort: "asc" },
      { colId: "city", sort: "asc" },
    ]);

    const cities: string[] = [];
    engine.getRowModel().forEachNode((node) => {
      cities.push(node.data?.city ?? "");
    });

    expect(cities).toEqual(["London", "Austin", "Boston"]);
    engine.destroy();
  });

  it("applies colDef initialSort on grid init without setSortModel", () => {
    const engine = createGridEngine<Row>({
      modules: [SortModule],
      columnDefs: [{ field: "name", headerName: "Name", width: 120, initialSort: "asc" }],
      rowData: [{ name: "Charlie" }, { name: "Alice" }, { name: "Bob" }],
    });

    expect(engine.getApi().getSortModel()).toEqual([{ colId: "name", sort: "asc" }]);

    const names: string[] = [];
    engine.getRowModel().forEachNode((node) => {
      names.push(node.data?.name ?? "");
    });

    expect(names).toEqual(["Alice", "Bob", "Charlie"]);
    engine.destroy();
  });

  it("prefers options.sortModel over colDef initialSort", () => {
    const engine = createGridEngine<Row>({
      modules: [SortModule],
      sortModel: [{ colId: "name", sort: "desc" }],
      columnDefs: [{ field: "name", headerName: "Name", width: 120, initialSort: "asc" }],
      rowData: [{ name: "Charlie" }, { name: "Alice" }, { name: "Bob" }],
    });

    expect(engine.getApi().getSortModel()).toEqual([{ colId: "name", sort: "desc" }]);

    const names: string[] = [];
    engine.getRowModel().forEachNode((node) => {
      names.push(node.data?.name ?? "");
    });

    expect(names).toEqual(["Charlie", "Bob", "Alice"]);
    engine.destroy();
  });

  it("applies multi-column colDef initialSort on init", () => {
    interface Employee {
      country: string;
      city: string;
    }

    const engine = createGridEngine<Employee>({
      modules: [SortModule],
      columnDefs: [
        { field: "country", headerName: "Country", width: 120, initialSort: { sort: "asc", sortIndex: 0 } },
        { field: "city", headerName: "City", width: 120, initialSort: { sort: "asc", sortIndex: 1 } },
      ],
      rowData: [
        { country: "US", city: "Boston" },
        { country: "US", city: "Austin" },
        { country: "UK", city: "London" },
      ],
    });

    expect(engine.getApi().getSortModel()).toEqual([
      { colId: "country", sort: "asc" },
      { colId: "city", sort: "asc" },
    ]);

    const cities: string[] = [];
    engine.getRowModel().forEachNode((node) => {
      cities.push(node.data?.city ?? "");
    });

    expect(cities).toEqual(["London", "Austin", "Boston"]);
    engine.destroy();
  });

  it("postSortRows can pin rows after primary sort", () => {
    interface Row {
      name: string;
      kind: "data" | "summary";
    }

    const engine = createGridEngine<Row>({
      modules: [SortModule],
      columnDefs: [{ field: "name", headerName: "Name", width: 120 }],
      rowData: [
        { name: "Charlie", kind: "data" },
        { name: "Alice", kind: "data" },
        { name: "Totals", kind: "summary" },
        { name: "Bob", kind: "data" },
      ],
      postSortRows: ({ nodes }) => {
        const summaryIndex = nodes.findIndex((node) => node.data?.kind === "summary");
        if (summaryIndex < 0) return;
        const [summary] = nodes.splice(summaryIndex, 1);
        nodes.push(summary!);
      },
    });

    engine.getApi().setSortModel([{ colId: "name", sort: "asc" }]);

    const names: string[] = [];
    engine.getRowModel().forEachNode((node) => {
      names.push(node.data?.name ?? "");
    });

    expect(names).toEqual(["Alice", "Bob", "Charlie", "Totals"]);
    engine.destroy();
  });

  it("accentedSort uses locale-aware string collation", () => {
    interface Row {
      label: string;
    }

    const engine = createGridEngine<Row>({
      modules: [SortModule],
      accentedSort: true,
      columnDefs: [{ field: "label", headerName: "Label", width: 120 }],
      rowData: [{ label: "a" }, { label: "à" }, { label: "b" }],
    });

    engine.getApi().setSortModel([{ colId: "label", sort: "asc" }]);

    const labels: string[] = [];
    engine.getRowModel().forEachNode((node) => {
      labels.push(node.data?.label ?? "");
    });

    expect(labels).toEqual(["a", "à", "b"]);
    engine.destroy();
  });
});
