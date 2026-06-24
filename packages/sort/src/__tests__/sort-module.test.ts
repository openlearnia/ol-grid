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
});
